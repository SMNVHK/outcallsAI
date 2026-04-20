root@srv1476455:/opt/outcallsAI# docker compose logs -f backend
recovia-backend  | 2026-04-20 08:55:29,298 INFO [scheduler] Campaign scheduler started
recovia-backend  | 2026-04-20 08:55:29,298 INFO [promise_checker] Promise overdue checker started
recovia-backend  | INFO:     Started server process [1]
recovia-backend  | INFO:     Waiting for application startup.
recovia-backend  | INFO:     Application startup complete.
recovia-backend  | INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
recovia-backend  | INFO:     76.13.60.239:0 - "GET /api/campaigns/analytics/dashboard HTTP/1.1" 422 Unprocessable Entity
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/analytics/overdue-promises HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/analytics/dashboard HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/contacts HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/analytics/dashboard HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/analytics/overdue-promises HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/analytics/overdue-promises HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/analytics/dashboard HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "POST /api/campaigns HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/auth/profile HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "PUT /api/auth/ai-config HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/analytics/dashboard HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/analytics/overdue-promises HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "POST /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:01:09,262 INFO [app.routers.campaigns] [SCHEDULE] campaign_id=1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 scheduled_at=2026-04-20T09:03:00.000Z agency=b98fbd4e-131d-476c-86de-134b8e3e6d59
recovia-backend  | 2026-04-20 09:01:09,332 INFO [app.routers.campaigns] [SCHEDULE] current status=draft
recovia-backend  | 2026-04-20 09:01:09,383 INFO [app.routers.campaigns] [SCHEDULE] update result: [{'id': '1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0', 'agency_id': 'b98fbd4e-131d-476c-86de-134b8e3e6d59', 'name': 'relance 20-04', 'status': 'scheduled', 'call_window_start': '09:00:00', 'call_window_end': '18:00:00', 'call_days': ['mon', 'tue', 'wed', 'thu', 'fri'], 'max_concurrent_calls': 5, 'max_attempts': 3, 'created_at': '2026-04-20T08:58:26.551+00:00', 'updated_at': '2026-04-20T08:58:26.551+00:00', 'scheduled_at': '2026-04-20T09:03:00+00:00'}]
recovia-backend  | INFO:     35.180.255.241:0 - "POST /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0/schedule HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:03:01,018 INFO [scheduler] Scheduler: launching campaign 1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0
recovia-backend  | 2026-04-20 09:03:01,394 INFO [app.services.campaign_runner] Campaign 1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 — pass initial: 1 tenants
recovia-backend  | 2026-04-20 09:03:01,509 INFO [app.services.campaign_runner] Calling Simon Vanderpoel (+32492***60) — attempt 1
recovia-backend  | 2026-04-20 09:03:01,639 INFO [app.services.caller] Connecting to ARI WebSocket...
recovia-backend  | 2026-04-20 09:03:01,666 INFO [app.services.caller] ARI WebSocket connected, Stasis app registered
recovia-backend  | 2026-04-20 09:03:01,675 INFO [app.services.caller] Creating ExternalMedia on port 37709...
recovia-backend  | 2026-04-20 09:03:01,692 INFO [app.services.caller] ExternalMedia channel: 1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelCreated | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelDialplan | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: Dial | channel=N/A
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelStateChange | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: Dial | channel=N/A
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,694 INFO [app.services.caller] ARI event: DeviceStateChanged | channel=N/A
recovia-backend  | 2026-04-20 09:03:01,695 INFO [app.services.caller] ARI event: StasisStart | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:01,698 INFO [app.services.caller] Asterisk RTP endpoint: 127.0.0.1:10802
recovia-backend  | 2026-04-20 09:03:01,698 INFO [app.services.caller] Originating call to 3249***60 via DIDWW...
recovia-backend  | 2026-04-20 09:03:01,701 INFO [app.services.caller] ARI event: ChannelCreated | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:01,701 INFO [app.services.caller] ARI event: ChannelDialplan | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:01,701 INFO [app.services.caller] ARI event: ChannelCallerId | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:01,704 INFO [app.services.caller] Outbound channel: 1776675781.1
recovia-backend  | 2026-04-20 09:03:01,704 INFO [app.services.caller] ARI event: ChannelConnectedLine | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:01,749 INFO [app.services.caller] Waiting for answer (max 35s)...
recovia-backend  | 2026-04-20 09:03:01,750 INFO [app.services.caller] ARI event: Dial | channel=N/A
recovia-backend  | 2026-04-20 09:03:12,769 INFO [app.services.caller] ARI event: Dial | channel=N/A
recovia-backend  | 2026-04-20 09:03:25,132 INFO [app.services.caller] ARI event: ChannelStateChange | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,133 INFO [app.services.caller] ARI event: Dial | channel=N/A
recovia-backend  | 2026-04-20 09:03:25,133 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,133 INFO [app.services.caller] ARI event: StasisStart | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,133 INFO [app.services.caller] Outbound channel answered! Creating bridge...
recovia-backend  | 2026-04-20 09:03:25,154 INFO [app.services.caller] Bridge 65174c22-782a-45ec-b3f4-f865a8ac2f7b created with both channels
recovia-backend  | 2026-04-20 09:03:25,154 INFO [app.services.caller] ARI event: DeviceStateChanged | channel=N/A
recovia-backend  | 2026-04-20 09:03:25,154 INFO [app.services.caller] ARI event: BridgeCreated | channel=N/A
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelEnteredBridge | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelEnteredBridge | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelConnectedLine | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:25,155 INFO [app.services.caller] ARI event: ChannelConnectedLine | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:25,234 INFO [app.services.caller] Call answered! Starting AI bridge...
recovia-backend  | 2026-04-20 09:03:26,254 INFO [app.services.caller] OpenAI Realtime WebSocket connected
recovia-backend  | 2026-04-20 09:03:26,256 INFO [app.services.caller] OpenAI msg #1: session.created
recovia-backend  | 2026-04-20 09:03:26,391 INFO [app.services.caller] OpenAI msg #2: session.updated
recovia-backend  | 2026-04-20 09:03:26,977 INFO [app.services.caller] OpenAI msg #3: input_audio_buffer.speech_started
recovia-backend  | 2026-04-20 09:03:26,978 INFO [app.services.caller] Barge-in detected: tenant speech started, clearing local playback
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:03:41,857 INFO [app.services.caller] OpenAI msg #4: input_audio_buffer.speech_stopped
recovia-backend  | 2026-04-20 09:03:41,859 INFO [app.services.caller] OpenAI msg #5: input_audio_buffer.committed
recovia-backend  | 2026-04-20 09:03:45,348 INFO [app.services.caller] AI function: status=voicemail attitude= promised=
recovia-backend  | 2026-04-20 09:03:45,351 INFO [app.services.caller] AI first response completed — no-interaction timer now active
recovia-backend  | 2026-04-20 09:03:45,858 INFO [app.services.caller] AI requested end_call: reason=voicemail
recovia-backend  | 2026-04-20 09:03:45,858 INFO [app.services.caller] Hanging up in 2s (letting goodbye audio finish)...
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:03:47,859 INFO [app.services.caller] Grace period over — disconnecting
recovia-backend  | 2026-04-20 09:03:47,859 INFO [app.services.caller] openai_to_rtp loop ended after 130 messages (WS closed or break)
recovia-backend  | 2026-04-20 09:03:47,859 INFO [app.services.caller] Audio bridge ended — finished: ['call_ended_wait', 'openai_to_rtp'] | human_spoke=True | ai_responded=True | hanging_up=True
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/56a66697-60f4-4dcb-9aab-8beb9b0b3bce/calls HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/messaging/history/56a66697-60f4-4dcb-9aab-8beb9b0b3bce HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:03:50,002 INFO [app.services.caller] ARI event: ChannelHangupRequest | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] ARI event: ChannelLeftBridge | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] ARI event: StasisEnd | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] Outbound channel left Stasis
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,004 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,005 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,005 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,005 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,005 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,005 INFO [app.services.caller] ARI event: ChannelHangupRequest | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:50,006 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:50,007 INFO [app.services.caller] ARI event: ChannelVarset | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:50,007 INFO [app.services.caller] ARI event: ChannelLeftBridge | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:50,007 INFO [app.services.caller] ARI event: ChannelDestroyed | channel=1776675781.1
recovia-backend  | 2026-04-20 09:03:50,007 INFO [app.services.caller] Outbound channel destroyed
recovia-backend  | 2026-04-20 09:03:50,007 INFO [app.services.caller] ARI event: StasisEnd | channel=1776675781.0
recovia-backend  | 2026-04-20 09:03:50,138 INFO [app.services.campaign_runner] Call completed for Simon Vanderpoel: completed
recovia-backend  | 2026-04-20 09:03:50,320 INFO [app.services.campaign_runner] Campaign 1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 — pass retry #1: 1 tenants
recovia-backend  | 2026-04-20 09:03:50,320 INFO [app.services.campaign_runner] Waiting 120s before retry pass...
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/tenants/56a66697-60f4-4dcb-9aab-8beb9b0b3bce/calls HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/messaging/history/56a66697-60f4-4dcb-9aab-8beb9b0b3bce HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "POST /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0/pause HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0/stats HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/campaign/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 HTTP/1.1" 200 OK
recovia-backend  | INFO:     13.38.107.39:0 - "GET /api/campaigns/1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0/stats HTTP/1.1" 200 OK
recovia-backend  | INFO:     35.180.255.241:0 - "GET /api/tenants/56a66697-60f4-4dcb-9aab-8beb9b0b3bce/calls HTTP/1.1" 200 OK
recovia-backend  | INFO:     15.237.192.80:0 - "GET /api/messaging/history/56a66697-60f4-4dcb-9aab-8beb9b0b3bce HTTP/1.1" 200 OK
recovia-backend  | 2026-04-20 09:05:50,369 INFO [app.services.campaign_runner] Campaign 1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0: no longer running
recovia-backend  | 2026-04-20 09:05:50,419 INFO [app.services.campaign_runner] Campaign 1f5b9a0c-4ac6-4bdb-b1e6-cc98b127dfa0 finished
recovia-backend  | 2026-04-20 09:05:50,709 INFO [app.services.email] Email sent to sim***@*** (id=8be9db06-5f2d-40d1-8fb6-03da204674e8)
recovia-backend  | 2026-04-20 09:05:50,710 INFO [app.services.campaign_runner] Campaign completion email sent to sim***


root@srv1476455:/opt/outcallsAI# docker compose logs --tail=200 asterisk
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:00:57] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-57034E99-69E5EB49000D87BD-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:01:26] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-5B64BCD0-69E5EB66000D87CA-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:01:55] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-76C5A778-69E5EB83000D87F9-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:02:24] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-47A334B1-69E5EBA0000D873C-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:02:54] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-029ABA55-69E5EBBE000D87C5-31B826C0) - No matching endpoint found
recovia-asterisk  |  Creating Stasis app 'recovia'
recovia-asterisk  |     -- Called 127.0.0.1:37709/c(ulaw)
recovia-asterisk  |     -- UnicastRTP/127.0.0.1:37709-0x72b9cc0037d0 answered
recovia-asterisk  |     -- Called 32492081960@didww-endpoint
recovia-asterisk  |     -- PJSIP/didww-endpoint-00000000 is making progress
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:03:22] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-6B31E28D-69E5EBDA000D8794-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- PJSIP/didww-endpoint-00000000 answered
recovia-asterisk  |     -- Channel PJSIP/didww-endpoint-00000000 joined 'simple_bridge' stasis-bridge <65174c22-782a-45ec-b3f4-f865a8ac2f7b>
recovia-asterisk  |     -- Channel UnicastRTP/127.0.0.1:37709-0x72b9cc0037d0 joined 'simple_bridge' stasis-bridge <65174c22-782a-45ec-b3f4-f865a8ac2f7b>
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Channel PJSIP/didww-endpoint-00000000 left 'simple_bridge' stasis-bridge <65174c22-782a-45ec-b3f4-f865a8ac2f7b>
recovia-asterisk  |     -- Channel UnicastRTP/127.0.0.1:37709-0x72b9cc0037d0 left 'simple_bridge' stasis-bridge <65174c22-782a-45ec-b3f4-f865a8ac2f7b>
recovia-asterisk  | [Apr 20 09:03:50] ERROR[33]: cdr_csv.c:275 writefile: Unable to open file /var/log/asterisk//cdr-csv//Master.csv : No such file or directory
recovia-asterisk  | [Apr 20 09:03:50] WARNING[33]: cdr_csv.c:308 csv_log: Unable to write CSV record to master '/var/log/asterisk//cdr-csv//Master.csv' : No such file or directory
recovia-asterisk  | [Apr 20 09:03:50] ERROR[33]: cdr_csv.c:275 writefile: Unable to open file /var/log/asterisk//cdr-csv//Master.csv : No such file or directory
recovia-asterisk  | [Apr 20 09:03:50] WARNING[33]: cdr_csv.c:308 csv_log: Unable to write CSV record to master '/var/log/asterisk//cdr-csv//Master.csv' : No such file or directory
recovia-asterisk  | [Apr 20 09:03:50] ERROR[33]: cdr_csv.c:275 writefile: Unable to open file /var/log/asterisk//cdr-csv//Master.csv : No such file or directory
recovia-asterisk  | [Apr 20 09:03:50] WARNING[33]: cdr_csv.c:308 csv_log: Unable to write CSV record to master '/var/log/asterisk//cdr-csv//Master.csv' : No such file or directory
recovia-asterisk  |  Deactivating Stasis app 'recovia'
recovia-asterisk  |  Shutting down application 'recovia'
recovia-asterisk  |  Destroying Stasis app recovia
recovia-asterisk  | [Apr 20 09:03:50] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-6C3064F5-69E5EBF6000D8820-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:04:21] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-7D25DB3E-69E5EC15000D87DD-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:04:51] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-424E21F1-69E5EC33000D87BB-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:05:20] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-7E37ED87-69E5EC50000D87EF-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:05:50] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-0E3189D2-69E5EC6E000D87D6-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:06:20] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-7B4FA82B-69E5EC8C000D87EA-31B826C0) - No matching endpoint found
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  |     -- Remote UNIX connection
recovia-asterisk  |     -- Remote UNIX connection disconnected
recovia-asterisk  | [Apr 20 09:06:50] NOTICE[36]: res_pjsip/pjsip_distributor.c:688 log_failed_request: Request 'OPTIONS' from '<sip:s@76.13.60.239>' failed for '185.238.173.44:5060' (callid: 24-6C824DBD-69E5ECAA000D87AA-31B826C0) - No matching endpoint found
root@srv1476455:/opt/outcallsAI# 