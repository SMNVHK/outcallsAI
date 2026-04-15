"""
Orchestrateur de campagne d'appels.
UN appel à la fois. Retry automatique des no_answer/call_dropped/busy
après un délai, jusqu'au max_attempts de la campagne.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import get_settings
from app.database import get_supabase
from app.services.caller import make_call
from app.services.email import send_email, build_campaign_completed_email, build_escalation_alert_email

logger = logging.getLogger(__name__)

_active_campaigns: dict[str, bool] = {}

BELGIUM_UTC_OFFSET = 2
DAY_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

RETRYABLE_STATUSES = {"no_answer", "call_dropped", "busy", "voicemail"}
RETRY_DELAY_SECONDS = 120
BETWEEN_CALLS_SECONDS = 10


def _mask_phone(phone: str) -> str:
    if len(phone) <= 6:
        return "***"
    return phone[:6] + "***" + phone[-2:]


def _check_call_window(campaign: dict) -> bool:
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


def _should_stop(campaign_id: str, campaign: dict, db, agency_id: str) -> str | None:
    """Return a reason string if we should stop, None otherwise."""
    if not _active_campaigns.get(campaign_id):
        return "stopped by user"

    campaign_check = db.table("campaigns").select("status").eq("id", campaign_id).execute()
    if not campaign_check.data or campaign_check.data[0]["status"] != "running":
        return "no longer running"

    if not _check_call_window(campaign):
        db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
        return "call window ended"

    if not _check_daily_limit(db, agency_id):
        db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
        return "daily limit"

    return None


async def _call_tenant(tenant: dict, campaign: dict, agency: dict, db) -> None:
    """Execute a single call and update tenant status."""
    tenant_id = tenant["id"]
    attempt = tenant.get("attempt_count", 0) + 1

    logger.info(f"Calling {tenant['name']} ({_mask_phone(tenant['phone'])}) — attempt {attempt}")
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
            "attempt_count": attempt,
            "last_called_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", tenant_id).execute()
    elif status == "no_answer":
        logger.info(f"No answer for {tenant['name']}")
        db.table("tenants").update({
            "status": "no_answer",
            "attempt_count": attempt,
            "last_called_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", tenant_id).execute()
    else:
        logger.info(f"Call completed for {tenant['name']}: {status}")

    updated = db.table("tenants").select("status, status_notes").eq("id", tenant_id).execute()
    if updated.data and updated.data[0].get("status") == "escalated":
        await _send_escalation_email(db, tenant, updated.data[0], campaign, agency)


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
        max_attempts = campaign.get("max_attempts", 3)

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

        if not _check_daily_limit(db, agency_id) or not _check_monthly_limit(db, agency_id):
            db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
            return

        pass_number = 0
        while True:
            pass_number += 1

            callable_statuses = ["pending"] if pass_number == 1 else list(RETRYABLE_STATUSES)
            tenants_query = db.table("tenants").select("*") \
                .eq("campaign_id", campaign_id) \
                .in_("status", callable_statuses) \
                .order("created_at")

            tenants = tenants_query.execute()

            if pass_number > 1:
                tenants.data = [t for t in (tenants.data or []) if t.get("attempt_count", 0) < max_attempts]

            if not tenants.data:
                if pass_number == 1:
                    logger.info(f"Campaign {campaign_id}: no pending tenants")
                else:
                    logger.info(f"Campaign {campaign_id}: no more retryable tenants")
                break

            label = "initial" if pass_number == 1 else f"retry #{pass_number - 1}"
            logger.info(f"Campaign {campaign_id} — pass {label}: {len(tenants.data)} tenants")

            if pass_number > 1:
                logger.info(f"Waiting {RETRY_DELAY_SECONDS}s before retry pass...")
                await asyncio.sleep(RETRY_DELAY_SECONDS)

            stopped = False
            for idx, tenant in enumerate(tenants.data):
                stop_reason = _should_stop(campaign_id, campaign, db, agency_id)
                if stop_reason:
                    logger.info(f"Campaign {campaign_id}: {stop_reason}")
                    stopped = True
                    break

                await _call_tenant(tenant, campaign, agency, db)

                if idx < len(tenants.data) - 1:
                    await asyncio.sleep(BETWEEN_CALLS_SECONDS)

            if stopped:
                break

            retryable = db.table("tenants").select("id") \
                .eq("campaign_id", campaign_id) \
                .in_("status", list(RETRYABLE_STATUSES)) \
                .lt("attempt_count", max_attempts) \
                .execute()

            if not retryable.data:
                logger.info(f"Campaign {campaign_id}: all tenants processed, no retries needed")
                break

            if pass_number >= max_attempts:
                logger.info(f"Campaign {campaign_id}: max retry passes reached ({max_attempts})")
                break

        db.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
        logger.info(f"Campaign {campaign_id} finished")

        await _send_completion_email(db, campaign_id, campaign, agency)

    except Exception as e:
        logger.exception(f"Campaign runner error: {e}")
        db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()

    finally:
        _active_campaigns.pop(campaign_id, None)


def stop_campaign(campaign_id: str):
    _active_campaigns.pop(campaign_id, None)


async def _send_completion_email(db, campaign_id: str, campaign: dict, agency: dict):
    try:
        settings = get_settings()
        if not settings.resend_api_key:
            logger.info("Resend not configured, skipping completion email")
            return

        agency_email = agency.get("email")
        if not agency_email:
            return

        tenants = db.table("tenants").select("status, amount_due").eq("campaign_id", campaign_id).execute()
        if not tenants.data:
            return

        total = len(tenants.data)
        will_pay = sum(1 for t in tenants.data if t["status"] == "will_pay")
        cant_pay = sum(1 for t in tenants.data if t["status"] == "cant_pay")
        refuses = sum(1 for t in tenants.data if t["status"] == "refuses")
        escalated = sum(1 for t in tenants.data if t["status"] == "escalated")
        no_answer = sum(1 for t in tenants.data if t["status"] == "no_answer")
        recoverable = sum(t["amount_due"] for t in tenants.data if t["status"] == "will_pay")

        subject, html, text = build_campaign_completed_email(
            campaign_name=campaign.get("name", ""),
            agency_name=agency.get("name", ""),
            total=total,
            will_pay=will_pay,
            cant_pay=cant_pay,
            refuses=refuses,
            escalated=escalated,
            no_answer=no_answer,
            amount_recoverable=recoverable,
        )

        await send_email(agency_email, subject, html, text)
        logger.info(f"Campaign completion email sent to {agency_email[:3]}***")
    except Exception as e:
        logger.error(f"Failed to send completion email: {e}")


async def _send_escalation_email(db, tenant: dict, updated_data: dict, campaign: dict, agency: dict):
    try:
        settings = get_settings()
        if not settings.resend_api_key:
            return

        agency_email = agency.get("email")
        if not agency_email:
            return

        subject, html, text = build_escalation_alert_email(
            tenant_name=tenant.get("name", ""),
            tenant_phone=_mask_phone(tenant.get("phone", "")),
            property_address=tenant.get("property_address", ""),
            amount_due=tenant.get("amount_due", 0),
            notes=updated_data.get("status_notes", "Aucune note"),
            campaign_name=campaign.get("name", ""),
            agency_name=agency.get("name", ""),
        )

        await send_email(agency_email, subject, html, text)
        logger.info(f"Escalation alert sent for tenant {tenant.get('name', 'N/A')}")
    except Exception as e:
        logger.error(f"Failed to send escalation email: {e}")
