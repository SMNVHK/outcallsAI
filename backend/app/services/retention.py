"""
Data retention job — GDPR compliance.
Clears transcripts, summaries, and AI notes from calls older than
the configured retention period (default: 90 days).
"""

import logging
from datetime import datetime, timedelta, timezone

from app.database import get_supabase

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 90


async def cleanup_old_call_data(retention_days: int = DEFAULT_RETENTION_DAYS):
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()

    result = db.table("calls").select("id") \
        .lt("started_at", cutoff) \
        .neq("transcript", None) \
        .execute()

    if not result.data:
        logger.info(f"Retention: no calls older than {retention_days} days with data to clean")
        return 0

    call_ids = [c["id"] for c in result.data]
    count = len(call_ids)

    for call_id in call_ids:
        db.table("calls").update({
            "transcript": None,
            "summary": None,
            "ai_notes": None,
        }).eq("id", call_id).execute()

    logger.info(f"Retention: cleared transcript/summary/notes from {count} calls older than {retention_days} days")
    return count
