"""
Orchestrateur de campagne d'appels.
UN appel à la fois, UN seul essai par tenant par lancement.
Pas de retry automatique — les retries se font manuellement
en relançant la campagne.
"""

import asyncio
import logging
from datetime import datetime, time, timezone

from app.config import get_settings
from app.database import get_supabase
from app.services.caller import make_call

logger = logging.getLogger(__name__)

_active_campaigns: dict[str, bool] = {}

BELGIUM_UTC_OFFSET = 2  # CEST (summer), 1 in winter — simplified
DAY_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


def _mask_phone(phone: str) -> str:
    """Mask phone number for logging: +324920***60"""
    if len(phone) <= 6:
        return "***"
    return phone[:6] + "***" + phone[-2:]


def _check_call_window(campaign: dict) -> bool:
    """Return True if current time in Belgium is within the campaign's call window."""
    now_utc = datetime.now(timezone.utc)
    belgium_hour = (now_utc.hour + BELGIUM_UTC_OFFSET) % 24

    start_str = campaign.get("call_window_start", "09:00:00")
    end_str = campaign.get("call_window_end", "18:00:00")
    start_h = int(str(start_str).split(":")[0])
    end_h = int(str(end_str).split(":")[0])

    if belgium_hour < start_h or belgium_hour >= end_h:
        return False

    call_days = campaign.get("call_days", ["mon", "tue", "wed", "thu", "fri"])
    belgium_weekday = (now_utc.weekday() + (1 if (now_utc.hour + BELGIUM_UTC_OFFSET) >= 24 else 0)) % 7
    allowed_weekdays = [DAY_MAP.get(d, -1) for d in call_days]
    return belgium_weekday in allowed_weekdays


def _check_daily_limit(db, agency_id: str) -> bool:
    """Return True if the agency hasn't exceeded its daily call limit."""
    settings = get_settings()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = db.table("calls").select("id", count="exact") \
        .gte("started_at", today_start.isoformat()) \
        .execute()

    today_count = len(result.data) if result.data else 0
    if today_count >= settings.daily_call_limit:
        logger.warning(f"Agency {agency_id}: daily limit reached ({today_count}/{settings.daily_call_limit})")
        return False
    return True


def _check_monthly_limit(db, agency_id: str) -> bool:
    """Return True if the agency hasn't exceeded its monthly call limit."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = db.table("calls").select("id", count="exact") \
        .gte("started_at", month_start.isoformat()) \
        .execute()

    month_count = len(result.data) if result.data else 0
    if month_count >= settings.monthly_call_limit:
        logger.warning(f"Agency {agency_id}: monthly limit reached ({month_count}/{settings.monthly_call_limit})")
        return False
    return True


async def start_campaign_calls(campaign_id: str):
    if campaign_id in _active_campaigns:
        logger.warning(f"Campaign {campaign_id} already running, skipping")
        return

    _active_campaigns[campaign_id] = True
    db = get_supabase()

    try:
        campaign = db.table("campaigns").select("*").eq("id", campaign_id).execute()
        if not campaign.data:
            logger.error(f"Campaign {campaign_id} not found")
            return
        campaign = campaign.data[0]

        agency = db.table("agencies").select("*").eq("id", campaign["agency_id"]).execute()
        if not agency.data:
            logger.error(f"Agency {campaign['agency_id']} not found")
            return
        agency = agency.data[0]
        agency_id = agency["id"]

        if not _check_call_window(campaign):
            logger.info(f"Campaign {campaign_id}: outside call window, pausing")
            db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
            return

        if not _check_daily_limit(db, agency_id):
            db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
            return

        if not _check_monthly_limit(db, agency_id):
            db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
            return

        pending = db.table("tenants").select("*") \
            .eq("campaign_id", campaign_id) \
            .eq("status", "pending") \
            .order("created_at") \
            .execute()

        if not pending.data:
            logger.info(f"Campaign {campaign_id}: no pending tenants")
            db.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
            return

        total = len(pending.data)
        logger.info(f"Campaign {campaign_id}: {total} tenants to call (one at a time)")

        for idx, tenant in enumerate(pending.data):
            if not _active_campaigns.get(campaign_id):
                logger.info(f"Campaign {campaign_id} stopped by user")
                break

            campaign_check = db.table("campaigns").select("status").eq("id", campaign_id).execute()
            if not campaign_check.data or campaign_check.data[0]["status"] != "running":
                logger.info(f"Campaign {campaign_id} no longer running")
                break

            if not _check_call_window(campaign):
                logger.info(f"Campaign {campaign_id}: call window ended, pausing")
                db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
                break

            if not _check_daily_limit(db, agency_id):
                db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
                break

            tenant_id = tenant["id"]
            logger.info(f"[{idx+1}/{total}] Calling tenant {tenant['name']} ({_mask_phone(tenant['phone'])})...")

            db.table("tenants").update({"status": "busy"}).eq("id", tenant_id).execute()

            try:
                result = await make_call(tenant, campaign, agency)
            except Exception as e:
                logger.error(f"Call exception for {tenant_id}: {e}")
                result = {"status": "failed", "error": str(e)}

            status = result.get("status", "failed") if isinstance(result, dict) else "failed"
            error = result.get("error", "") if isinstance(result, dict) else str(result)

            if status == "failed":
                logger.warning(f"Call failed for {tenant['name']}: {error[:100]}")
                db.table("tenants").update({
                    "status": "call_dropped",
                    "status_notes": f"Échec: {error[:200]}",
                    "attempt_count": tenant.get("attempt_count", 0) + 1,
                    "last_called_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", tenant_id).execute()
            elif status == "no_answer":
                logger.info(f"No answer for {tenant['name']}")
                db.table("tenants").update({
                    "status": "no_answer",
                    "attempt_count": tenant.get("attempt_count", 0) + 1,
                    "last_called_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", tenant_id).execute()
            else:
                logger.info(f"Call completed for {tenant['name']}: {status}")

            if idx < total - 1:
                logger.info("Waiting 10s before next call...")
                await asyncio.sleep(10)

        db.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
        logger.info(f"Campaign {campaign_id} finished")

    except Exception as e:
        logger.exception(f"Campaign runner error: {e}")
        db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()

    finally:
        _active_campaigns.pop(campaign_id, None)


def stop_campaign(campaign_id: str):
    _active_campaigns.pop(campaign_id, None)
