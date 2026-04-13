"""
Service d'appels sortants via Asterisk ARI + OpenAI Realtime WebSocket.

Architecture :
1. Python demande à Asterisk (via ARI REST API) d'appeler le locataire via DIDWW
2. Asterisk crée un ExternalMedia channel qui envoie le RTP vers notre service
3. On bridge l'audio RTP ↔ OpenAI Realtime WebSocket
4. OpenAI gère la conversation + function calling
5. On met à jour les statuts en DB
"""

import asyncio
import base64
import json
import logging
import struct
import socket
from datetime import datetime, timezone

import httpx
import websockets

from app.config import get_settings
from app.database import get_supabase
from app.prompts.rent_reminder import get_system_prompt, get_tools_definition

logger = logging.getLogger(__name__)

PCMU_TO_LINEAR = None  # Will be populated if needed
SAMPLE_RATE_OPENAI = 24000
SAMPLE_RATE_PHONE = 8000


async def make_call(tenant: dict, campaign: dict, agency: dict) -> dict:
    """Lance un appel sortant vers un locataire via Asterisk ARI."""
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

        rtp_port = _get_free_udp_port()

        async with httpx.AsyncClient() as http:
            # Créer un channel ExternalMedia pour recevoir le RTP
            ext_media_resp = await http.post(
                f"{ari_url}/channels/externalMedia",
                auth=(ari_user, ari_pass),
                json={
                    "app": "outcallsai",
                    "external_host": f"127.0.0.1:{rtp_port}",
                    "format": "ulaw",
                },
            )

            if ext_media_resp.status_code != 200:
                raise Exception(f"ARI ExternalMedia failed: {ext_media_resp.text}")

            ext_media = ext_media_resp.json()
            ext_channel_id = ext_media["channel"]["id"]

            # Appeler le locataire via le trunk DIDWW
            call_resp = await http.post(
                f"{ari_url}/channels",
                auth=(ari_user, ari_pass),
                json={
                    "endpoint": f"PJSIP/{dial_number}@didww-endpoint",
                    "app": "outcallsai",
                    "callerId": agency.get("caller_id") or settings.caller_id,
                    "timeout": 30,
                },
            )

            if call_resp.status_code != 200:
                db.table("calls").update({
                    "status": "failed",
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": f"ARI call failed: {call_resp.text}",
                }).eq("id", call_id).execute()
                return {"status": "failed", "call_id": call_id}

            outbound_channel = call_resp.json()
            outbound_channel_id = outbound_channel["id"]

        db.table("calls").update({"status": "ringing"}).eq("id", call_id).execute()

        # Attendre que l'appel soit décroché via ARI events (WebSocket)
        answered = await _wait_for_answer(
            ari_url, ari_user, ari_pass,
            outbound_channel_id, ext_channel_id,
            timeout=35,
        )

        if not answered:
            db.table("calls").update({
                "status": "no_answer",
                "ended_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", call_id).execute()
            return {"status": "no_answer", "call_id": call_id}

        db.table("calls").update({"status": "answered"}).eq("id", call_id).execute()

        # Préparer le prompt
        system_prompt = get_system_prompt(
            agency_name=agency["name"],
            agency_phone=agency.get("phone", ""),
        )
        system_prompt = system_prompt.replace("{property_address}", tenant["property_address"])
        system_prompt = system_prompt.replace("{amount_due}", str(tenant["amount_due"]))
        system_prompt = system_prompt.replace("{due_date}", str(tenant["due_date"]))

        # Lancer le bridge audio RTP ↔ OpenAI Realtime
        result = await _bridge_rtp_to_openai(
            rtp_port=rtp_port,
            system_prompt=system_prompt,
            tools=get_tools_definition(),
            settings=settings,
        )

        # Raccrocher
        async with httpx.AsyncClient() as http:
            await http.delete(
                f"{ari_url}/channels/{outbound_channel_id}",
                auth=(ari_user, ari_pass),
            )
            await http.delete(
                f"{ari_url}/channels/{ext_channel_id}",
                auth=(ari_user, ari_pass),
            )

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
            )

        return {"status": "completed", "call_id": call_id, "result": result}

    except Exception as e:
        logger.exception(f"Erreur appel locataire {tenant['id']}")
        db.table("calls").update({
            "status": "failed",
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "error_message": str(e)[:500],
        }).eq("id", call_id).execute()
        return {"status": "failed", "call_id": call_id, "error": str(e)}


async def _wait_for_answer(
    ari_url: str, user: str, password: str,
    outbound_id: str, ext_media_id: str,
    timeout: int = 35,
) -> bool:
    """Écoute les événements ARI via WebSocket et attend que l'appel soit décroché."""
    ws_url = ari_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/events?api_key={user}:{password}&app=outcallsai"

    try:
        async with websockets.connect(ws_url) as ws:
            end_time = asyncio.get_event_loop().time() + timeout
            while asyncio.get_event_loop().time() < end_time:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=2)
                    event = json.loads(msg)
                    event_type = event.get("type", "")

                    if event_type == "StasisStart" and event.get("channel", {}).get("id") == outbound_id:
                        # L'appel est décroché, bridger les channels
                        async with httpx.AsyncClient() as http:
                            bridge_resp = await http.post(
                                f"{ari_url}/bridges",
                                auth=(user, password),
                                json={"type": "mixing"},
                            )
                            bridge = bridge_resp.json()
                            await http.post(
                                f"{ari_url}/bridges/{bridge['id']}/addChannel",
                                auth=(user, password),
                                json={"channel": f"{outbound_id},{ext_media_id}"},
                            )
                        return True

                    if event_type == "ChannelDestroyed" and event.get("channel", {}).get("id") == outbound_id:
                        return False

                except asyncio.TimeoutError:
                    continue
    except Exception as e:
        logger.error(f"ARI WebSocket error: {e}")

    return False


async def _bridge_rtp_to_openai(
    rtp_port: int,
    system_prompt: str,
    tools: list[dict],
    settings,
) -> dict:
    """
    Bridge bidirectionnel : RTP (Asterisk) ↔ OpenAI Realtime WebSocket.
    - Reçoit l'audio ulaw du téléphone via UDP (RTP)
    - Convertit en PCM16 et envoie à OpenAI
    - Reçoit l'audio PCM16 d'OpenAI, convertit en ulaw, renvoie en RTP
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

    # Socket UDP pour recevoir/envoyer le RTP
    rtp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    rtp_sock.bind(("0.0.0.0", rtp_port))
    rtp_sock.setblocking(False)

    remote_rtp_addr = None  # Sera rempli quand on reçoit le premier paquet RTP

    try:
        async with websockets.connect(openai_url, additional_headers=headers) as ws:
            # Configurer la session OpenAI Realtime
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["audio", "text"],
                    "instructions": system_prompt,
                    "voice": "alloy",
                    "input_audio_format": "g711_ulaw",
                    "output_audio_format": "g711_ulaw",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 700,
                    },
                    "tools": tools,
                },
            }))

            async def rtp_to_openai():
                """Lit les paquets RTP du téléphone et les envoie à OpenAI."""
                nonlocal remote_rtp_addr, call_active
                loop = asyncio.get_event_loop()

                while call_active:
                    try:
                        data, addr = await asyncio.wait_for(
                            loop.run_in_executor(None, lambda: rtp_sock.recvfrom(4096)),
                            timeout=1.0,
                        )
                        remote_rtp_addr = addr

                        if len(data) > 12:
                            # Skip RTP header (12 bytes), le reste c'est l'audio ulaw
                            audio_payload = data[12:]
                            audio_b64 = base64.b64encode(audio_payload).decode("ascii")
                            await ws.send(json.dumps({
                                "type": "input_audio_buffer.append",
                                "audio": audio_b64,
                            }))
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        if call_active:
                            logger.error(f"RTP read error: {e}")
                        break

            rtp_sequence = 0
            rtp_timestamp = 0
            rtp_ssrc = 12345678

            async def openai_to_rtp():
                """Reçoit l'audio d'OpenAI et l'envoie en RTP vers Asterisk."""
                nonlocal tenant_status, tenant_notes, call_active
                nonlocal rtp_sequence, rtp_timestamp

                async for message in ws:
                    if not call_active:
                        break

                    event = json.loads(message)
                    event_type = event.get("type", "")

                    if event_type == "response.audio.delta":
                        if remote_rtp_addr:
                            audio_bytes = base64.b64decode(event["delta"])
                            # Envoyer en paquets RTP de 160 bytes (20ms de ulaw à 8kHz)
                            for i in range(0, len(audio_bytes), 160):
                                chunk = audio_bytes[i:i + 160]
                                rtp_header = struct.pack(
                                    "!BBHII",
                                    0x80,       # V=2, P=0, X=0, CC=0
                                    0x00,       # M=0, PT=0 (PCMU)
                                    rtp_sequence & 0xFFFF,
                                    rtp_timestamp & 0xFFFFFFFF,
                                    rtp_ssrc,
                                )
                                rtp_sock.sendto(rtp_header + chunk, remote_rtp_addr)
                                rtp_sequence += 1
                                rtp_timestamp += 160

                    elif event_type == "response.audio_transcript.delta":
                        transcript_parts.append(event.get("delta", ""))

                    elif event_type == "conversation.item.input_audio_transcription.completed":
                        user_text = event.get("transcript", "")
                        if user_text:
                            transcript_parts.append(f"\n[Locataire]: {user_text}\n")

                    elif event_type == "response.function_call_arguments.done":
                        func_name = event.get("name", "")
                        try:
                            args = json.loads(event.get("arguments", "{}"))
                        except json.JSONDecodeError:
                            args = {}

                        if func_name == "update_tenant_status":
                            tenant_status = args.get("status")
                            tenant_notes = args.get("notes", "")
                            logger.info(f"Function call: status={tenant_status}, notes={tenant_notes}")

                        call_output_id = event.get("call_id", "")
                        await ws.send(json.dumps({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "function_call_output",
                                "call_id": call_output_id,
                                "output": json.dumps({"success": True}),
                            },
                        }))
                        await ws.send(json.dumps({"type": "response.create"}))

                    elif event_type == "error":
                        logger.error(f"OpenAI error: {event}")
                        call_active = False
                        break

            # Lancer les deux tâches en parallèle
            rtp_task = asyncio.create_task(rtp_to_openai())
            openai_task = asyncio.create_task(openai_to_rtp())

            # Attendre max 5 minutes (durée max d'un appel de relance)
            try:
                await asyncio.wait_for(
                    asyncio.gather(rtp_task, openai_task, return_exceptions=True),
                    timeout=300,
                )
            except asyncio.TimeoutError:
                logger.info("Call timeout (5 min max)")
            finally:
                call_active = False
                rtp_task.cancel()
                openai_task.cancel()

    finally:
        rtp_sock.close()

    duration = (datetime.now(timezone.utc) - start_time).seconds
    return {
        "transcript": "".join(transcript_parts),
        "summary": tenant_notes,
        "tenant_status": tenant_status,
        "tenant_notes": tenant_notes,
        "duration_seconds": duration,
    }


def _update_tenant_from_call(db, tenant_id: str, status: str, notes: str):
    update_data = {
        "status": status,
        "status_notes": notes,
        "last_called_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    tenant = db.table("tenants").select("attempt_count").eq("id", tenant_id).execute()
    if tenant.data:
        update_data["attempt_count"] = tenant.data[0].get("attempt_count", 0) + 1
    db.table("tenants").update(update_data).eq("id", tenant_id).execute()


def _get_free_udp_port() -> int:
    """Trouve un port UDP libre pour recevoir le RTP."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port
