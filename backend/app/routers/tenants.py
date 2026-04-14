from fastapi import APIRouter, HTTPException, Depends

from app.models import TenantResponse, CallResponse
from app.database import get_supabase
from app.routers.deps import get_current_agency_id

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/campaign/{campaign_id}", response_model=list[TenantResponse])
async def list_tenants(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    campaign = db.table("campaigns").select("id").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    result = db.table("tenants").select("*").eq("campaign_id", campaign_id).order("created_at").execute()
    return [_format(t) for t in result.data]


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("tenants").select("*, campaigns!inner(agency_id)").eq("id", tenant_id).execute()
    if not result.data or result.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")
    return _format(result.data[0])


@router.get("/{tenant_id}/calls", response_model=list[CallResponse])
async def get_tenant_calls(tenant_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    tenant_check = db.table("tenants").select("id, campaigns!inner(agency_id)").eq("id", tenant_id).execute()
    if not tenant_check.data or tenant_check.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")

    result = db.table("calls").select("*").eq("tenant_id", tenant_id).order("started_at", desc=True).execute()
    return [
        CallResponse(
            id=c["id"],
            tenant_id=c["tenant_id"],
            campaign_id=c["campaign_id"],
            status=c["status"],
            duration_seconds=c.get("duration_seconds"),
            transcript=c.get("transcript"),
            summary=c.get("summary"),
            ai_status_result=c.get("ai_status_result"),
            ai_notes=c.get("ai_notes"),
            started_at=str(c["started_at"]),
            ended_at=str(c["ended_at"]) if c.get("ended_at") else None,
            error_message=c.get("error_message"),
        )
        for c in result.data
    ]


def _format(t: dict) -> TenantResponse:
    return TenantResponse(
        id=t["id"],
        campaign_id=t["campaign_id"],
        name=t["name"],
        phone=t["phone"],
        property_address=t["property_address"],
        amount_due=t["amount_due"],
        due_date=str(t["due_date"]),
        status=t["status"],
        status_notes=t.get("status_notes"),
        promised_date=str(t["promised_date"]) if t.get("promised_date") else None,
        attempt_count=t.get("attempt_count", 0),
        last_called_at=str(t["last_called_at"]) if t.get("last_called_at") else None,
        next_retry_at=str(t["next_retry_at"]) if t.get("next_retry_at") else None,
    )
