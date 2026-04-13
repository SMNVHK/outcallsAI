from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
import csv
import io

from app.models import (
    CampaignCreate, CampaignResponse, CampaignStatus,
    TenantCSVRow, TenantResponse,
)
from app.database import get_supabase
from app.routers.deps import get_current_agency_id

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("campaigns").insert({
        "agency_id": agency_id,
        "name": data.name,
        "call_window_start": data.call_window_start.isoformat(),
        "call_window_end": data.call_window_end.isoformat(),
        "call_days": data.call_days,
        "max_concurrent_calls": data.max_concurrent_calls,
        "max_attempts": data.max_attempts,
    }).execute()

    campaign = result.data[0]
    return _format_campaign(campaign)


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("campaigns").select("*").eq("agency_id", agency_id).order("created_at", desc=True).execute()
    return [_format_campaign(c) for c in result.data]


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    campaign = result.data[0]

    tenants = db.table("tenants").select("status").eq("campaign_id", campaign_id).execute()
    campaign["tenant_count"] = len(tenants.data)
    campaign["pending_count"] = sum(1 for t in tenants.data if t["status"] == "pending")
    campaign["completed_count"] = sum(1 for t in tenants.data if t["status"] not in ("pending",))

    return _format_campaign(campaign)


@router.post("/{campaign_id}/upload-csv", response_model=list[TenantResponse])
async def upload_csv(
    campaign_id: str,
    file: UploadFile = File(...),
    agency_id: str = Depends(get_current_agency_id),
):
    db = get_supabase()

    campaign = db.table("campaigns").select("id").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")

    expected_fields = {"name", "phone", "property_address", "amount_due", "due_date"}
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="Fichier CSV vide")

    actual_fields = {f.strip().lower() for f in reader.fieldnames}
    missing = expected_fields - actual_fields
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes manquantes : {', '.join(missing)}. Attendues : {', '.join(expected_fields)}",
        )

    tenants_to_insert = []
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            cleaned = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            tenant = TenantCSVRow(
                name=cleaned["name"],
                phone=cleaned["phone"],
                property_address=cleaned["property_address"],
                amount_due=float(cleaned["amount_due"].replace(",", ".")),
                due_date=cleaned["due_date"],
            )
            tenants_to_insert.append({
                "campaign_id": campaign_id,
                "name": tenant.name,
                "phone": tenant.phone,
                "property_address": tenant.property_address,
                "amount_due": tenant.amount_due,
                "due_date": tenant.due_date,
            })
        except Exception as e:
            errors.append(f"Ligne {i}: {str(e)}")

    if errors and not tenants_to_insert:
        raise HTTPException(status_code=400, detail=f"Erreurs CSV : {'; '.join(errors[:5])}")

    if tenants_to_insert:
        result = db.table("tenants").insert(tenants_to_insert).execute()
        return [_format_tenant(t) for t in result.data]

    return []


@router.post("/{campaign_id}/start")
async def start_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    if campaign.data[0]["status"] not in ("draft", "paused", "completed"):
        raise HTTPException(status_code=400, detail="La campagne ne peut pas être démarrée dans cet état")

    tenants = db.table("tenants").select("id").eq("campaign_id", campaign_id).eq("status", "pending").execute()
    if not tenants.data:
        raise HTTPException(status_code=400, detail="Aucun locataire en attente dans cette campagne")

    db.table("campaigns").update({"status": "running"}).eq("id", campaign_id).execute()

    from app.services.campaign_runner import start_campaign_calls
    import asyncio
    asyncio.create_task(start_campaign_calls(campaign_id))

    return {"message": f"Campagne démarrée avec {len(tenants.data)} locataires à appeler"}


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
    return {"message": "Campagne mise en pause"}


def _format_campaign(c: dict) -> CampaignResponse:
    return CampaignResponse(
        id=c["id"],
        agency_id=c["agency_id"],
        name=c["name"],
        status=c["status"],
        call_window_start=str(c.get("call_window_start", "09:00")),
        call_window_end=str(c.get("call_window_end", "18:00")),
        call_days=c.get("call_days", []),
        max_concurrent_calls=c.get("max_concurrent_calls", 5),
        max_attempts=c.get("max_attempts", 3),
        created_at=str(c.get("created_at", "")),
        tenant_count=c.get("tenant_count"),
        pending_count=c.get("pending_count"),
        completed_count=c.get("completed_count"),
    )


def _format_tenant(t: dict) -> TenantResponse:
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
