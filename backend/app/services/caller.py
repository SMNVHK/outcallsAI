"""
Appels sortants via Asterisk ARI + OpenAI Realtime.

Architecture documentée (sources) :
- Asterisk ARI docs: Getting Started, ExternalMedia
- ari-py originate_example.py, bridge-move.py
- thevysh/AsteriskOpenAIRealtimeAssistant (ari.py, main.py, realtime.py)

Flow :
1. WebSocket ARI → enregistre l'app Stasis, écoute les events en background
2. POST /channels/externalMedia → crée le canal RTP (audio bidirectionnel)
3. GET /channels/{id}/variable → récupère UNICASTRTP_LOCAL_ADDRESS/PORT
4. POST /channels → originate l'appel sortant vers DIDWW
5. StasisStart event sur le canal sortant = appel décroché
6. POST /bridges + addChannel → bridge les deux canaux
7. UDP RTP ↔ OpenAI Realtime WebSocket (audio bidirectionnel)
"""

import asyncio
import base64
import json
import logging
import socket
import struct
from datetime import datetime, timezone

import httpx
import websockets

from app.config import get_settings
from app.database import get_supabase
from app.prompts.rent_reminder import get_system_prompt, get_tools_definition

logger = logging.getLogger(__name__)

# RTP constants for ulaw (G.711 μ-law)
RTP_PAYLOAD_ULAW = 0
RTP_SAMPLES_PER_FRAME = 160  # 8000 Hz * 20ms
RTP_FRAME_DURATION_SEC = 0.02
RTP_PLAYOUT_PREBUFFER_FRAMES = 2  # 40ms — minimise la latence de début de réponse
ULAW_SILENCE_BYTE = 0xFF


async def make_call(tenant: dict, campaign: dict, agency: dict) -> dict:
    db = get_supabase()
    settings = get_settings()

    call_record = db.table("calls").insert({
        "tenant_id": tenant["id"],
        "campaign_id": campaign["id"],
        "status": "initiated",
    }).execute()
    call_id = call_record.data[0]["id"]

    try:
        phone = tenant["phone"].strip().replace(" ", "")
        if not phone.startswith("+"):
            phone = f"+{phone}"
        dial_number = phone.lstrip("+")

        ari_url = settings.asterisk_ari_url
        ari_user = settings.asterisk_ari_user
        ari_pass = settings.asterisk_ari_password
        caller_id = agency.get("caller_id") or settings.caller_id

        listen_port = _get_free_udp_port()

        # -- Coordination events --
        call_answered = asyncio.Event()
        call_ended = asyncio.Event()
        call_failed_before_answer = False

        outbound_id = None
        ext_media_id = None

        # -- ARI event handler (runs in background task) --
        async def on_ari_event(event: dict):
            nonlocal call_failed_before_answer
            evt_type = event.get("type", "")
            ch_id = event.get("channel", {}).get("id", "")

            logger.info(f"ARI event: {evt_type} | channel={ch_id[:20] if ch_id else 'N/A'}")

            if evt_type == "StasisStart" and ch_id == outbound_id:
                logger.info(f"Outbound channel answered! Creating bridge...")
                try:
                    async with httpx.AsyncClient(timeout=10) as http:
                        # Doc: POST /bridges?type=mixing (query param)
                        br = await http.post(
                            f"{ari_url}/bridges",
                            auth=(ari_user, ari_pass),
                            params={"type": "mixing"},
                        )
                        if br.status_code >= 300:
                            logger.error(f"Bridge create failed: {br.status_code} {br.text}")
                            return
                        bridge_id = br.json()["id"]

                        # Doc: POST /bridges/{id}/addChannel?channel=id1,id2
                        add = await http.post(
                            f"{ari_url}/bridges/{bridge_id}/addChannel",
                            auth=(ari_user, ari_pass),
                            params={"channel": f"{outbound_id},{ext_media_id}"},
                        )
                        if add.status_code >= 300:
                            logger.error(f"Bridge addChannel failed: {add.status_code} {add.text}")
                            return

                    logger.info(f"Bridge {bridge_id} created with both channels")
                    call_answered.set()
                except Exception as e:
                    logger.error(f"Error during bridge creation: {e}")

            elif evt_type == "ChannelDestroyed" and ch_id == outbound_id:
                logger.info(f"Outbound channel destroyed")
                if not call_answered.is_set():
                    call_failed_before_answer = True
                    call_answered.set()
                call_ended.set()

            elif evt_type == "StasisEnd" and ch_id == outbound_id:
                logger.info(f"Outbound channel left Stasis")
                call_ended.set()

        # -- 1. Connect ARI WebSocket (registers Stasis app) --
        # Doc: wscat -c "ws://localhost:8088/ari/events?api_key=user:pass&app=myapp"
        ari_ws_url = (
            f"ws://localhost:8088/ari/events"
            f"?api_key={ari_user}:{ari_pass}"
            f"&app=recovia"
            f"&subscribeAll=true"
        )
        logger.info("Connecting to ARI WebSocket...")

        async with websockets.connect(ari_ws_url) as ws:
            logger.info("ARI WebSocket connected, Stasis app registered")

            # Background task to process ARI events for the duration of the call
            async def event_loop():
                try:
                    async for raw_msg in ws:
                        try:
                            event = json.loads(raw_msg)
                            await on_ari_event(event)
                        except json.JSONDecodeError:
                            continue
                except websockets.ConnectionClosed:
                    logger.warning("ARI WebSocket closed by server")
                except Exception as e:
                    logger.error(f"ARI event loop error: {e}")

            event_task = asyncio.create_task(event_loop())

            try:
                async with httpx.AsyncClient(timeout=15) as http:

                    # -- 2. Create ExternalMedia channel --
                    # Doc: POST /channels/externalMedia?app=...&external_host=...&format=ulaw
                    logger.info(f"Creating ExternalMedia on port {listen_port}...")
                    em_resp = await http.post(
                        f"{ari_url}/channels/externalMedia",
                        auth=(ari_user, ari_pass),
                        params={
                            "app": "recovia",
                            "external_host": f"127.0.0.1:{listen_port}",
                            "format": "ulaw",
                        },
                    )
                    if em_resp.status_code >= 300:
                        raise RuntimeError(f"ExternalMedia failed ({em_resp.status_code}): {em_resp.text}")

                    em = em_resp.json()
                    ext_media_id = em["id"]
                    logger.info(f"ExternalMedia channel: {ext_media_id}")

                    # -- 3. Get UNICASTRTP_LOCAL_ADDRESS/PORT --
                    # Doc: "chan_rtp sets UNICASTRTP_LOCAL_ADDRESS and UNICASTRTP_LOCAL_PORT"
                    addr_resp = await http.get(
                        f"{ari_url}/channels/{ext_media_id}/variable",
                        auth=(ari_user, ari_pass),
                        params={"variable": "UNICASTRTP_LOCAL_ADDRESS"},
                    )
                    port_resp = await http.get(
                        f"{ari_url}/channels/{ext_media_id}/variable",
                        auth=(ari_user, ari_pass),
                        params={"variable": "UNICASTRTP_LOCAL_PORT"},
                    )

                    if addr_resp.status_code >= 300 or port_resp.status_code >= 300:
                        raise RuntimeError(
                            f"Failed to get UNICASTRTP vars: "
                            f"addr={addr_resp.status_code} port={port_resp.status_code}"
                        )

                    asterisk_rtp_addr = addr_resp.json()["value"]
                    asterisk_rtp_port = int(port_resp.json()["value"])
                    logger.info(f"Asterisk RTP endpoint: {asterisk_rtp_addr}:{asterisk_rtp_port}")

                    # -- 4. Originate outbound call --
                    # Doc: POST /channels?endpoint=...&app=...&callerId=...
                    masked = dial_number[:4] + "***" + dial_number[-2:] if len(dial_number) > 6 else "***"
                    logger.info(f"Originating call to {masked} via DIDWW...")
                    call_resp = await http.post(
                        f"{ari_url}/channels",
                        auth=(ari_user, ari_pass),
                        params={
                            "endpoint": f"PJSIP/{dial_number}@didww-endpoint",
                            "app": "recovia",
                            "appArgs": "dialed",
                            "callerId": caller_id,
                            "timeout": 30,
                        },
                    )
                    if call_resp.status_code >= 300:
                        raise RuntimeError(f"Originate failed ({call_resp.status_code}): {call_resp.text}")

                    outbound = call_resp.json()
                    outbound_id = outbound["id"]
                    logger.info(f"Outbound channel: {outbound_id}")

                db.table("calls").update({"status": "ringing"}).eq("id", call_id).execute()

                # -- 5. Wait for StasisStart (= answered) --
                logger.info("Waiting for answer (max 35s)...")
                try:
                    await asyncio.wait_for(call_answered.wait(), timeout=35)
                except asyncio.TimeoutError:
                    logger.info("Call timeout — no answer")

                if call_failed_before_answer or not call_answered.is_set():
                    logger.info(f"Call not answered: {dial_number}")
                    async with httpx.AsyncClient(timeout=5) as http:
                        await http.delete(f"{ari_url}/channels/{outbound_id}", auth=(ari_user, ari_pass))
                        await http.delete(f"{ari_url}/channels/{ext_media_id}", auth=(ari_user, ari_pass))
                    db.table("calls").update({
                        "status": "no_answer",
                        "ended_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", call_id).execute()
                    return {"status": "no_answer", "call_id": call_id}

                # -- 6. Call answered — bridge RTP to OpenAI --
                db.table("calls").update({"status": "answered"}).eq("id", call_id).execute()
                logger.info(f"Call answered! Starting AI bridge...")

                system_prompt = get_system_prompt(
                    agency_name=agency["name"],
                    agency_phone=agency.get("phone", ""),
                    ai_tone=agency.get("ai_tone", "balanced"),
                    ai_custom_notes=agency.get("ai_custom_notes", ""),
                )
                system_prompt = system_prompt.replace("{property_address}", tenant["property_address"])
                system_prompt = system_prompt.replace("{amount_due}", str(tenant["amount_due"]))
                system_prompt = system_prompt.replace("{due_date}", str(tenant["due_date"]))

                # -- 7. Bidirectional RTP ↔ OpenAI Realtime --
                result = await _bridge_rtp_to_openai(
                    listen_port=listen_port,
                    asterisk_rtp_addr=asterisk_rtp_addr,
                    asterisk_rtp_port=asterisk_rtp_port,
                    call_ended_event=call_ended,
                    system_prompt=system_prompt,
                    tools=get_tools_definition(),
                    settings=settings,
                )

                # Cleanup channels
                async with httpx.AsyncClient(timeout=5) as http:
                    await http.delete(f"{ari_url}/channels/{outbound_id}", auth=(ari_user, ari_pass))
                    await http.delete(f"{ari_url}/channels/{ext_media_id}", auth=(ari_user, ari_pass))

                db.table("calls").update({
                    "status": "completed",
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "duration_seconds": result.get("duration_seconds", 0),
                    "transcript": result.get("transcript", ""),
                    "summary": result.get("summary", ""),
                    "ai_status_result": result.get("tenant_status", ""),
                    "ai_notes": result.get("tenant_notes", ""),
                }).eq("id", call_id).execute()

                if result.get("tenant_status"):
                    _update_tenant_from_call(
                        db, tenant["id"],
                        status=result["tenant_status"],
                        notes=result.get("tenant_notes", ""),
                        promised_date=result.get("promised_date"),
                    )

                return {"status": "completed", "call_id": call_id, "result": result}

            finally:
                event_task.cancel()
                try:
                    await event_task
                except asyncio.CancelledError:
                    pass

    except Exception as e:
        logger.exception(f"Call error for tenant {tenant['id']}: {e}")
        _update_call_failed(db, call_id, str(e)[:500])
        return {"status": "failed", "call_id": call_id, "error": str(e)}


async def _bridge_rtp_to_openai(
    listen_port: int,
    asterisk_rtp_addr: str,
    asterisk_rtp_port: int,
    call_ended_event: asyncio.Event,
    system_prompt: str,
    tools: list[dict],
    settings,
) -> dict:
    """
    Bridge bidirectionnel RTP (Asterisk) ↔ OpenAI Realtime WebSocket.

    - On REÇOIT l'audio d'Asterisk sur listen_port (UDP)
    - On ENVOIE l'audio vers Asterisk sur asterisk_rtp_addr:asterisk_rtp_port
    Source: thevysh/AsteriskOpenAIRealtimeAssistant realtime.py
    """
    openai_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "OpenAI-Beta": "realtime=v1",
    }

    transcript_parts = []
    tenant_status = None
    tenant_notes = ""
    start_time = datetime.now(timezone.utc)
    call_active = True
    human_speech_detected = False
    hanging_up = False
    ai_first_response_done = False
    last_activity_time = asyncio.get_event_loop().time()

    MAX_CALL_DURATION = 300
    NO_INTERACTION_TIMEOUT = 45
    MAX_DRAIN_NORMAL = 8
    MAX_DRAIN_VOICEMAIL = 12
    POST_GOODBYE_WAIT = 15

    rtp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    rtp_sock.bind(("0.0.0.0", listen_port))
    rtp_sock.setblocking(False)

    rtp_seq = 0
    rtp_ts = 0
    rtp_ssrc = 0xDEADBEEF
    playout_buffer = bytearray()
    playout_lock = asyncio.Lock()
    playout_started = False
    need_marker = True
    hangup_reason = "conversation_ended"
    current_response_id = None
    current_output_item_id = None
    current_output_content_index = 0
    played_item_id = None
    played_audio_ms = 0

    try:
        async with websockets.connect(
            openai_url,
            additional_headers=headers,
            close_timeout=5,
            ping_interval=20,
            ping_timeout=10,
            max_size=2**23,
        ) as ws:
            logger.info("OpenAI Realtime WebSocket connected")

            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["audio", "text"],
                    "instructions": system_prompt,
                    "voice": "coral",
                    "input_audio_format": "g711_ulaw",
                    "output_audio_format": "g711_ulaw",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.3,
                        "prefix_padding_ms": 200,
                        "silence_duration_ms": 300,
                    },
                    "temperature": 0.7,
                    "tools": tools,
                },
            }))

            await ws.send(json.dumps({"type": "response.create"}))

            loop = asyncio.get_running_loop()

            # -- Task 1: RTP from Asterisk → OpenAI --
            async def rtp_to_openai():
                nonlocal call_active
                while call_active and not call_ended_event.is_set():
                    try:
                        data = await loop.sock_recv(rtp_sock, 4096)
                        if hanging_up:
                            continue
                        if not ai_first_response_done:
                            continue
                        if len(data) > 12:
                            audio_payload = data[12:]
                            await ws.send(json.dumps({
                                "type": "input_audio_buffer.append",
                                "audio": base64.b64encode(audio_payload).decode("ascii"),
                            }))
                    except (asyncio.CancelledError, OSError):
                        break
                    except Exception as e:
                        if call_active:
                            logger.error(f"RTP→OpenAI error: {e}")
                        break

            # -- Task 2: RTP sender with fixed 20ms cadence --
            async def rtp_sender():
                nonlocal rtp_seq, rtp_ts, call_active, playout_started, need_marker
                nonlocal played_item_id, played_audio_ms
                next_send_at = loop.time()

                while call_active and not call_ended_event.is_set():
                    try:
                        now = loop.time()
                        sleep_for = next_send_at - now
                        if sleep_for > 0:
                            await asyncio.sleep(sleep_for)
                        elif sleep_for < -0.1:
                            # If the event loop stalls, resync instead of bursting packets.
                            next_send_at = now
                    except asyncio.CancelledError:
                        break

                    async with playout_lock:
                        if not playout_started and len(playout_buffer) >= (
                            RTP_PLAYOUT_PREBUFFER_FRAMES * RTP_SAMPLES_PER_FRAME
                        ):
                            playout_started = True

                        if playout_started and len(playout_buffer) >= RTP_SAMPLES_PER_FRAME:
                            chunk = bytes(playout_buffer[:RTP_SAMPLES_PER_FRAME])
                            del playout_buffer[:RTP_SAMPLES_PER_FRAME]
                            is_audio_frame = True
                        else:
                            chunk = bytes([ULAW_SILENCE_BYTE]) * RTP_SAMPLES_PER_FRAME
                            if len(playout_buffer) == 0:
                                playout_started = False
                            is_audio_frame = False

                    pt_byte = RTP_PAYLOAD_ULAW
                    if is_audio_frame and need_marker:
                        pt_byte |= 0x80
                        need_marker = False
                    elif not is_audio_frame:
                        need_marker = True

                    header = struct.pack(
                        "!BBHII",
                        0x80,
                        pt_byte,
                        rtp_seq & 0xFFFF,
                        rtp_ts & 0xFFFFFFFF,
                        rtp_ssrc,
                    )
                    rtp_sock.sendto(
                        header + chunk,
                        (asterisk_rtp_addr, asterisk_rtp_port),
                    )
                    rtp_seq += 1
                    rtp_ts += RTP_SAMPLES_PER_FRAME
                    if is_audio_frame and current_output_item_id:
                        played_item_id = current_output_item_id
                        played_audio_ms += int(RTP_FRAME_DURATION_SEC * 1000)
                    next_send_at += RTP_FRAME_DURATION_SEC

            # -- Task 3: OpenAI events → queue audio + handle events --
            async def openai_to_rtp():
                nonlocal tenant_status, tenant_notes, call_active, hanging_up, hangup_reason
                nonlocal human_speech_detected, ai_first_response_done, last_activity_time
                nonlocal current_response_id, current_output_item_id, current_output_content_index
                nonlocal played_item_id, played_audio_ms, playout_started, need_marker

                msg_count = 0
                async for message in ws:
                    if not call_active or call_ended_event.is_set():
                        logger.info(f"openai_to_rtp exiting: call_active={call_active} call_ended={call_ended_event.is_set()}")
                        break

                    event = json.loads(message)
                    evt_type = event.get("type", "")
                    msg_count += 1
                    if msg_count <= 5 or evt_type in ("error", "session.created", "session.updated"):
                        logger.info(f"OpenAI msg #{msg_count}: {evt_type}")

                    if evt_type in ("response.audio.delta", "response.output_audio.delta"):
                        audio_bytes = base64.b64decode(event["delta"])
                        item_id = event.get("item_id")
                        if item_id and item_id != current_output_item_id:
                            current_output_item_id = item_id
                            current_output_content_index = event.get("content_index", 0)
                            played_audio_ms = 0
                            played_item_id = item_id
                        current_response_id = event.get("response_id", current_response_id)
                        async with playout_lock:
                            playout_buffer.extend(audio_bytes)

                    elif evt_type in ("response.audio_transcript.delta", "response.output_audio_transcript.delta"):
                        transcript_parts.append(event.get("delta", ""))

                    elif evt_type == "conversation.item.input_audio_transcription.completed":
                        user_text = event.get("transcript", "")
                        if user_text:
                            transcript_parts.append(f"\n[Locataire]: {user_text}\n")

                    elif evt_type == "input_audio_buffer.speech_started":
                        human_speech_detected = True
                        last_activity_time = asyncio.get_event_loop().time()
                        if hanging_up:
                            logger.info("Speech detected during hangup — ignoring (call ending)")
                            continue
                        if not ai_first_response_done:
                            logger.info("Speech detected during opening — ignoring barge-in (first response still playing)")
                            continue
                        logger.info("Barge-in detected: tenant speech started, clearing local playback")

                        async with playout_lock:
                            playout_buffer.clear()
                            playout_started = False
                            need_marker = True

                        if played_item_id and played_audio_ms > 0:
                            await ws.send(json.dumps({
                                "type": "conversation.item.truncate",
                                "item_id": played_item_id,
                                "content_index": current_output_content_index,
                                "audio_end_ms": played_audio_ms,
                            }))
                            logger.info(
                                f"Truncated assistant audio at {played_audio_ms}ms for item {played_item_id}"
                            )
                            played_audio_ms = 0
                            current_output_item_id = None
                            current_output_content_index = 0

                    elif evt_type == "response.done":
                        last_activity_time = asyncio.get_event_loop().time()
                        if not ai_first_response_done:
                            ai_first_response_done = True
                            logger.info("AI first response completed — no-interaction timer now active")
                        current_response_id = None
                        current_output_item_id = None
                        current_output_content_index = 0

                        if hanging_up:
                            max_drain = MAX_DRAIN_VOICEMAIL if hangup_reason == "voicemail" else MAX_DRAIN_NORMAL
                            drain_start = asyncio.get_event_loop().time()
                            logger.info(f"Hangup: response.done received, draining audio buffer (max {max_drain}s)...")
                            while asyncio.get_event_loop().time() - drain_start < max_drain:
                                async with playout_lock:
                                    if len(playout_buffer) < RTP_SAMPLES_PER_FRAME:
                                        break
                                await asyncio.sleep(0.1)
                            elapsed = asyncio.get_event_loop().time() - drain_start
                            logger.info(f"Audio drained in {elapsed:.1f}s — waiting for remote hangup (max {POST_GOODBYE_WAIT}s)...")
                            try:
                                await asyncio.wait_for(call_ended_event.wait(), timeout=POST_GOODBYE_WAIT)
                                logger.info("Remote hangup detected — clean exit")
                            except asyncio.TimeoutError:
                                logger.info(f"No remote hangup after {POST_GOODBYE_WAIT}s — disconnecting")
                            call_active = False
                            call_ended_event.set()
                            break

                    elif evt_type == "response.function_call_arguments.done":
                        func_name = event.get("name", "")
                        try:
                            args = json.loads(event.get("arguments", "{}"))
                        except json.JSONDecodeError:
                            args = {}

                        if func_name == "update_tenant_status":
                            tenant_status = args.get("status")
                            tenant_notes = args.get("notes", "")
                            attitude = args.get("tenant_attitude", "")
                            promised = args.get("promised_date", "")
                            if attitude:
                                tenant_notes = f"[Attitude: {attitude}] {tenant_notes}"
                            if promised:
                                tenant_notes = f"{tenant_notes} [Date promise: {promised}]"
                            logger.info(f"AI function: status={tenant_status} attitude={attitude} promised={promised}")

                        elif func_name == "end_call":
                            reason = args.get("reason", "conversation_ended")
                            logger.info(f"AI requested end_call: reason={reason}")
                            hanging_up = True
                            hangup_reason = reason
                            await ws.send(json.dumps({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": event.get("call_id", ""),
                                    "output": json.dumps({"success": True, "action": "hanging_up"}),
                                },
                            }))
                            logger.info("Hanging up — waiting for response.done to drain audio...")
                            continue

                        await ws.send(json.dumps({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "function_call_output",
                                "call_id": event.get("call_id", ""),
                                "output": json.dumps({"success": True}),
                            },
                        }))
                        await ws.send(json.dumps({"type": "response.create"}))

                    elif evt_type == "error":
                        logger.error(f"OpenAI error: {event}")
                        call_active = False
                        break

                logger.info(f"openai_to_rtp loop ended after {msg_count} messages (WS closed or break)")

            async def no_interaction_watchdog():
                """
                Safety net: if AI has finished greeting and no human interaction
                for NO_INTERACTION_TIMEOUT seconds, hang up.

                CRITICAL: this task must NOT complete when hanging_up=True.
                If it did, asyncio.wait(FIRST_COMPLETED) would trigger early
                and cancel the end_call grace-period sleep, cutting the goodbye.
                So when hanging_up is set, we just keep sleeping — the end_call
                handler is responsible for finishing the call cleanly.
                """
                nonlocal tenant_status, tenant_notes
                while call_active and not call_ended_event.is_set():
                    await asyncio.sleep(5)
                    if hanging_up or not ai_first_response_done:
                        continue
                    elapsed = asyncio.get_event_loop().time() - last_activity_time
                    if elapsed >= NO_INTERACTION_TIMEOUT:
                        logger.warning(
                            f"No interaction for {elapsed:.0f}s after AI response — "
                            f"human_speech_detected={human_speech_detected}, ending call"
                        )
                        if not tenant_status:
                            tenant_status = "voicemail" if not human_speech_detected else "no_answer"
                            tenant_notes = (
                                f"Aucune interaction pendant {elapsed:.0f}s. "
                                f"{'Probable messagerie vocale.' if not human_speech_detected else 'Le locataire a cessé de répondre.'}"
                            )
                        call_ended_event.set()
                        return

            rtp_task = asyncio.create_task(rtp_to_openai())
            sender_task = asyncio.create_task(rtp_sender())
            openai_task = asyncio.create_task(openai_to_rtp())
            ended_task = asyncio.create_task(call_ended_event.wait())
            watchdog_task = asyncio.create_task(no_interaction_watchdog())

            task_names = {
                id(rtp_task): "rtp_to_openai",
                id(sender_task): "rtp_sender",
                id(openai_task): "openai_to_rtp",
                id(ended_task): "call_ended_wait",
                id(watchdog_task): "no_interaction_watchdog",
            }

            try:
                done, pending = await asyncio.wait(
                    [rtp_task, sender_task, openai_task, ended_task, watchdog_task],
                    timeout=MAX_CALL_DURATION,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                finished = [task_names.get(id(t), "unknown") for t in done]
                for t in done:
                    if t.exception():
                        logger.error(f"Task {task_names.get(id(t), '?')} crashed: {t.exception()}")
                logger.info(
                    f"Audio bridge ended — finished: {finished} | "
                    f"human_spoke={human_speech_detected} | ai_responded={ai_first_response_done} | "
                    f"hanging_up={hanging_up}"
                )
            finally:
                call_active = False
                for t in [rtp_task, sender_task, openai_task, ended_task, watchdog_task]:
                    t.cancel()

    finally:
        rtp_sock.close()

    duration = (datetime.now(timezone.utc) - start_time).seconds

    promised = None
    if "[Date promise:" in tenant_notes:
        import re
        m = re.search(r"\[Date promise: (\d{4}-\d{2}-\d{2})\]", tenant_notes)
        if m:
            promised = m.group(1)

    return {
        "transcript": "".join(transcript_parts),
        "summary": tenant_notes,
        "tenant_status": tenant_status,
        "tenant_notes": tenant_notes,
        "promised_date": promised,
        "duration_seconds": duration,
    }


def _update_call_failed(db, call_id: str, error_msg: str):
    db.table("calls").update({
        "status": "failed",
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "error_message": error_msg[:500],
    }).eq("id", call_id).execute()


def _update_tenant_from_call(db, tenant_id: str, status: str, notes: str, promised_date: str | None = None):
    update_data = {
        "status": status,
        "status_notes": notes,
        "last_called_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if promised_date:
        update_data["promised_date"] = promised_date
    tenant = db.table("tenants").select("attempt_count").eq("id", tenant_id).execute()
    if tenant.data:
        update_data["attempt_count"] = tenant.data[0].get("attempt_count", 0) + 1
    db.table("tenants").update(update_data).eq("id", tenant_id).execute()


def _get_free_udp_port() -> int:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port
