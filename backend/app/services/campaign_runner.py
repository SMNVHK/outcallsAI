"""
Orchestrateur de campagne d'appels.
Gère la file d'attente, le rate limiting, et les retries.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.database import get_supabase
from app.services.caller import make_call

logger = logging.getLogger(__name__)

_active_campaigns: dict[str, bool] = {}


async def start_campaign_calls(campaign_id: str):
    """
    Lance les appels pour une campagne.
    Appelé en background via asyncio.create_task().
    """
    if campaign_id in _active_campaigns:
        logger.warning(f"Campaign {campaign_id} already running")
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

        max_concurrent = campaign.get("max_concurrent_calls", 5)
        semaphore = asyncio.Semaphore(max_concurrent)

        while _active_campaigns.get(campaign_id):
            campaign_check = db.table("campaigns").select("status").eq("id", campaign_id).execute()
            if not campaign_check.data or campaign_check.data[0]["status"] != "running":
                logger.info(f"Campaign {campaign_id} no longer running, stopping")
                break

            pending = db.table("tenants").select("*") \
                .eq("campaign_id", campaign_id) \
                .eq("status", "pending") \
                .order("created_at") \
                .limit(max_concurrent) \
                .execute()

            if not pending.data:
                logger.info(f"Campaign {campaign_id}: no more pending tenants")
                db.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
                break

            tasks = []
            for tenant in pending.data:
                tasks.append(_call_with_semaphore(semaphore, tenant, campaign, agency))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Call failed for tenant {pending.data[i]['id']}: {result}")

            await asyncio.sleep(2)

    except Exception as e:
        logger.exception(f"Campaign runner error for {campaign_id}")
        db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()

    finally:
        _active_campaigns.pop(campaign_id, None)


async def _call_with_semaphore(semaphore: asyncio.Semaphore, tenant: dict, campaign: dict, agency: dict):
    async with semaphore:
        return await make_call(tenant, campaign, agency)


def stop_campaign(campaign_id: str):
    _active_campaigns.pop(campaign_id, None)
