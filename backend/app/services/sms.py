import logging
import httpx
from base64 import b64encode

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_sms(destination: str, content: str) -> dict:
    """Send an SMS via DIDWW HTTP OUT API (JSON:API spec)."""
    settings = get_settings()

    if not settings.didww_sms_username or not settings.didww_sms_password:
        raise RuntimeError("DIDWW SMS credentials not configured")

    if not settings.didww_sms_source:
        raise RuntimeError("DIDWW SMS source number not configured")

    phone = destination.replace(" ", "").replace("-", "")
    if phone.startswith("0"):
        phone = "+32" + phone[1:]
    if not phone.startswith("+"):
        phone = "+" + phone

    credentials = b64encode(
        f"{settings.didww_sms_username}:{settings.didww_sms_password}".encode()
    ).decode()

    payload = {
        "data": {
            "type": "outbound_messages",
            "attributes": {
                "destination": phone.lstrip("+"),
                "source": settings.didww_sms_source.lstrip("+"),
                "content": content,
            },
        }
    }

    masked = phone[:5] + "***" + phone[-2:] if len(phone) > 7 else "***"
    logger.info(f"Sending SMS to {masked}")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            settings.didww_sms_endpoint,
            json=payload,
            headers={
                "Content-Type": "application/vnd.api+json",
                "Authorization": f"Basic {credentials}",
            },
        )

    if resp.status_code == 201:
        data = resp.json()
        msg_id = data.get("data", {}).get("id", "unknown")
        logger.info(f"SMS sent successfully (id={msg_id})")
        return {"success": True, "message_id": msg_id}
    else:
        logger.error(f"SMS failed: {resp.status_code} — {resp.text}")
        return {"success": False, "error": resp.text, "status_code": resp.status_code}
