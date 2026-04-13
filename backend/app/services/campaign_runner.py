"""
Orchestrateur de campagne d'appels.
UN appel à la fois, UN seul essai par tenant par lancement.
Pas de retry automatique — les retries se font manuellement
en relançant la campagne.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.database import get_supabase
from app.services.caller import make_call

logger = logging.getLogger(__name__)

_active_campaigns: dict[str, bool] = {}


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

            tenant_id = tenant["id"]
            logger.info(f"[{idx+1}/{total}] Calling tenant {tenant['name']} ({tenant['phone']})...")

            # Mark as in-progress so it won't be picked up again
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

            # 10 seconds between calls to not spam
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
