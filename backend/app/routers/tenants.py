from fastapi import APIRouter, HTTPException, Depends
import re

from app.models import TenantResponse, TenantCreate, CallResponse
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


@router.post("/campaign/{campaign_id}", response_model=TenantResponse)
async def add_tenant(campaign_id: str, data: TenantCreate, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    campaign = db.table("campaigns").select("id").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    phone = data.phone.strip().replace(" ", "")
    if not re.match(r"^\+?\d{8,15}$", phone):
        raise HTTPException(status_code=400, detail="Numéro de téléphone invalide")

    if data.amount_due <= 0 or data.amount_due > 100_000:
        raise HTTPException(status_code=400, detail="Montant invalide (0-100 000€)")

    insert_data = {
        "campaign_id": campaign_id,
        "name": data.name.strip(),
        "phone": phone,
        "property_address": data.property_address.strip(),
        "amount_due": data.amount_due,
        "due_date": str(data.due_date),
    }
    if data.email:
        insert_data["email"] = data.email.strip()

    result = db.table("tenants").insert(insert_data).execute()

    return _format(result.data[0])


@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    tenant = db.table("tenants").select("id, campaigns!inner(agency_id)").eq("id", tenant_id).execute()
    if not tenant.data or tenant.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")

    db.table("calls").delete().eq("tenant_id", tenant_id).execute()
    db.table("tenants").delete().eq("id", tenant_id).execute()
    return {"message": "Locataire supprimé"}


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
        email=t.get("email"),
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
