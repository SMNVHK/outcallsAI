import logging
import sys

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.routers import auth, campaigns, tenants, messaging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
    force=True,
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title="Recovia",
    description="Recouvrement de loyers automatisé par IA vocale",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

from app.config import get_settings

_settings = get_settings()

_allowed_origins = [_settings.frontend_url]
if "localhost" not in _settings.frontend_url:
    _allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(tenants.router, prefix="/api")
app.include_router(messaging.router, prefix="/api")

_logger = logging.getLogger("recovia")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    _logger.error(f"Unhandled error on {request.method} {request.url.path}: {type(exc).__name__}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": f"Erreur interne: {str(exc)}"})


@app.get("/api/health")
@limiter.exempt
async def health(request: Request):
    return {"status": "ok", "service": "Recovia", "version": "0.2.0"}


@app.post("/api/admin/retention")
@limiter.limit("1/hour")
async def run_retention(request: Request):
    from app.services.retention import cleanup_old_call_data
    count = await cleanup_old_call_data()
    return {"cleaned": count}


@app.on_event("startup")
async def start_scheduler():
    import asyncio
    asyncio.create_task(_campaign_scheduler())


async def _campaign_scheduler():
    """Check every 30s for campaigns scheduled to start now."""
    import asyncio
    from datetime import datetime, timezone
    from app.database import get_supabase

    logger = logging.getLogger("scheduler")
    logger.info("Campaign scheduler started")

    while True:
        try:
            await asyncio.sleep(30)
            db = get_supabase()
            now = datetime.now(timezone.utc).isoformat()

            scheduled = db.table("campaigns") \
                .select("id") \
                .eq("status", "scheduled") \
                .lte("scheduled_at", now) \
                .execute()

            for camp in (scheduled.data or []):
                cid = camp["id"]
                logger.info(f"Scheduler: launching campaign {cid}")

                pending = db.table("tenants").select("id").eq("campaign_id", cid).eq("status", "pending").execute()
                if not pending.data:
                    logger.info(f"Scheduler: campaign {cid} has no pending tenants, marking completed")
                    db.table("campaigns").update({"status": "completed"}).eq("id", cid).execute()
                    continue

                db.table("campaigns").update({"status": "running"}).eq("id", cid).execute()

                from app.services.campaign_runner import start_campaign_calls
                asyncio.create_task(start_campaign_calls(cid))

        except Exception as e:
            logger.error(f"Scheduler error: {e}")
