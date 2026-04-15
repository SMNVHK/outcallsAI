from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone
import csv
import io

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models import (
    CampaignCreate, CampaignResponse, CampaignStatus, CampaignSchedule,
    TenantCSVRow, TenantResponse,
)
from app.database import get_supabase
from app.routers.deps import get_current_agency_id

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/activity")
async def get_recent_activity(agency_id: str = Depends(get_current_agency_id)):
    """Timeline des appels récents pour l'agence (24 dernières heures)."""
    db = get_supabase()

    campaigns = db.table("campaigns").select("id").eq("agency_id", agency_id).execute()
    if not campaigns.data:
        return []

    campaign_ids = [c["id"] for c in campaigns.data]

    all_calls = []
    for cid in campaign_ids:
        calls = db.table("calls").select(
            "id, tenant_id, campaign_id, status, duration_seconds, summary, ai_status_result, ai_notes, started_at, ended_at, error_message"
        ).eq("campaign_id", cid).order("started_at", desc=True).limit(50).execute()
        all_calls.extend(calls.data)

    all_calls.sort(key=lambda c: c.get("started_at", ""), reverse=True)
    all_calls = all_calls[:50]

    tenant_ids = list({c["tenant_id"] for c in all_calls if c.get("tenant_id")})
    tenants_map = {}
    if tenant_ids:
        for tid in tenant_ids:
            t = db.table("tenants").select("id, name, phone, property_address, amount_due, status").eq("id", tid).execute()
            if t.data:
                tenants_map[tid] = t.data[0]

    campaign_names = {}
    for cid in campaign_ids:
        camp = db.table("campaigns").select("id, name").eq("id", cid).execute()
        if camp.data:
            campaign_names[cid] = camp.data[0]["name"]

    result = []
    for call in all_calls:
        tenant = tenants_map.get(call["tenant_id"], {})
        result.append({
            "call_id": call["id"],
            "tenant_name": tenant.get("name", "Inconnu"),
            "tenant_phone": tenant.get("phone", ""),
            "property_address": tenant.get("property_address", ""),
            "amount_due": tenant.get("amount_due", 0),
            "campaign_name": campaign_names.get(call["campaign_id"], ""),
            "campaign_id": call["campaign_id"],
            "call_status": call["status"],
            "ai_result": call.get("ai_status_result"),
            "summary": call.get("summary"),
            "ai_notes": call.get("ai_notes"),
            "duration_seconds": call.get("duration_seconds"),
            "started_at": call.get("started_at"),
            "ended_at": call.get("ended_at"),
            "error_message": call.get("error_message"),
            "needs_attention": call.get("ai_status_result") in ("refuses", "escalated", "cant_pay"),
        })

    return result


@router.post("", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    insert_data = {
        "agency_id": agency_id,
        "name": data.name,
        "call_window_start": data.call_window_start.isoformat(),
        "call_window_end": data.call_window_end.isoformat(),
        "call_days": data.call_days,
        "max_concurrent_calls": data.max_concurrent_calls,
        "max_attempts": data.max_attempts,
    }
    if data.scheduled_at:
        insert_data["scheduled_at"] = data.scheduled_at.isoformat()

    result = db.table("campaigns").insert(insert_data).execute()

    campaign = result.data[0]
    return _format_campaign(campaign)


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("campaigns").select("*").eq("agency_id", agency_id).order("created_at", desc=True).execute()
    campaigns = []
    for c in result.data:
        tenants = db.table("tenants").select("status").eq("campaign_id", c["id"]).execute()
        c["tenant_count"] = len(tenants.data)
        c["pending_count"] = sum(1 for t in tenants.data if t["status"] == "pending")
        c["completed_count"] = sum(1 for t in tenants.data if t["status"] not in ("pending", "busy"))
        campaigns.append(_format_campaign(c))
    return campaigns


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


MAX_CSV_SIZE = 1 * 1024 * 1024  # 1 MB
MAX_CSV_ROWS = 500


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
    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux (max {MAX_CSV_SIZE // 1024}KB)")

    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")

    required_fields = {"name", "phone", "property_address", "amount_due", "due_date"}
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="Fichier CSV vide")

    actual_fields = {f.strip().lower() for f in reader.fieldnames}
    missing = required_fields - actual_fields
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes manquantes : {', '.join(missing)}. Attendues : {', '.join(required_fields)}",
        )
    has_email = "email" in actual_fields

    tenants_to_insert = []
    errors = []
    for i, row in enumerate(reader, start=2):
        if i - 1 > MAX_CSV_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"Trop de lignes (max {MAX_CSV_ROWS}). Découpez votre fichier.",
            )
        try:
            cleaned = {k.strip().lower(): v.strip() for k, v in row.items() if k}

            phone = cleaned["phone"].strip().replace(" ", "")
            if not phone.replace("+", "").isdigit() or len(phone) < 8:
                raise ValueError(f"Numéro invalide: {phone}")

            amount = float(cleaned["amount_due"].replace(",", "."))
            if amount <= 0 or amount > 100_000:
                raise ValueError(f"Montant invalide: {amount}")

            tenant = TenantCSVRow(
                name=cleaned["name"],
                phone=phone,
                email=cleaned.get("email", "").strip() or None if has_email else None,
                property_address=cleaned["property_address"],
                amount_due=amount,
                due_date=cleaned["due_date"],
            )
            row_data = {
                "campaign_id": campaign_id,
                "name": tenant.name,
                "phone": tenant.phone,
                "property_address": tenant.property_address,
                "amount_due": tenant.amount_due,
                "due_date": tenant.due_date,
            }
            if tenant.email:
                row_data["email"] = tenant.email
            tenants_to_insert.append(row_data)
        except Exception as e:
            errors.append(f"Ligne {i}: {str(e)}")

    if errors and not tenants_to_insert:
        raise HTTPException(status_code=400, detail=f"Erreurs CSV : {'; '.join(errors[:5])}")

    if tenants_to_insert:
        result = db.table("tenants").insert(tenants_to_insert).execute()
        return [_format_tenant(t) for t in result.data]

    return []


@router.post("/{campaign_id}/start")
@limiter.limit("2/minute")
async def start_campaign(request: Request, campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    if campaign.data[0]["status"] not in ("draft", "paused", "completed", "scheduled"):
        raise HTTPException(status_code=400, detail="La campagne ne peut pas être démarrée dans cet état")

    tenants = db.table("tenants").select("id").eq("campaign_id", campaign_id).eq("status", "pending").execute()
    if not tenants.data:
        raise HTTPException(status_code=400, detail="Aucun locataire en attente dans cette campagne")

    db.table("campaigns").update({"status": "running"}).eq("id", campaign_id).execute()

    from app.services.campaign_runner import start_campaign_calls
    import asyncio
    asyncio.create_task(start_campaign_calls(campaign_id))

    return {"message": f"Campagne démarrée avec {len(tenants.data)} locataires à appeler"}


@router.post("/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: str,
    data: CampaignSchedule,
    agency_id: str = Depends(get_current_agency_id),
):
    """Planifier le lancement d'une campagne à une date/heure précise."""
    db = get_supabase()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    if campaign.data[0]["status"] not in ("draft", "paused", "completed"):
        raise HTTPException(status_code=400, detail="La campagne ne peut pas être planifiée dans cet état")

    db.table("campaigns").update({
        "status": "scheduled",
        "scheduled_at": data.scheduled_at,
    }).eq("id", campaign_id).execute()

    return {"message": f"Campagne planifiée pour {data.scheduled_at}"}


@router.post("/{campaign_id}/reset")
async def reset_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    if campaign.data[0]["status"] == "running":
        raise HTTPException(status_code=400, detail="Impossible de reset une campagne en cours. Mettez-la en pause d'abord.")

    db.table("tenants").update({
        "status": "pending",
        "status_notes": None,
        "promised_date": None,
        "attempt_count": 0,
        "last_called_at": None,
        "next_retry_at": None,
    }).eq("campaign_id", campaign_id).execute()

    db.table("campaigns").update({"status": "draft"}).eq("id", campaign_id).execute()

    count = db.table("tenants").select("id", count="exact").eq("campaign_id", campaign_id).execute()
    return {"message": f"Campagne réinitialisée — {count.count} locataires remis en attente"}


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    if campaign.data[0]["status"] == "running":
        raise HTTPException(status_code=400, detail="Impossible de supprimer une campagne en cours")

    tenants = db.table("tenants").select("id").eq("campaign_id", campaign_id).execute()
    for t in tenants.data:
        db.table("calls").delete().eq("tenant_id", t["id"]).execute()
    db.table("tenants").delete().eq("campaign_id", campaign_id).execute()
    db.table("campaigns").delete().eq("id", campaign_id).execute()
    return {"message": "Campagne supprimée"}


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
    return {"message": "Campagne mise en pause"}


@router.get("/{campaign_id}/report")
async def get_campaign_report(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    """Rapport complet d'une campagne — preuve légale de chaque relance."""
    db = get_supabase()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    agency = db.table("agencies").select("name, email, phone").eq("id", agency_id).execute()
    agency_info = agency.data[0] if agency.data else {}

    tenants = db.table("tenants").select("*").eq("campaign_id", campaign_id).order("name").execute()

    report_tenants = []
    for t in tenants.data:
        calls = db.table("calls").select("*").eq("tenant_id", t["id"]).order("started_at").execute()
        messages = db.table("tenant_messages").select("*").eq("tenant_id", t["id"]).order("created_at").execute()

        report_tenants.append({
            "name": t["name"],
            "phone": t["phone"],
            "property_address": t["property_address"],
            "amount_due": t["amount_due"],
            "due_date": str(t["due_date"]),
            "current_status": t["status"],
            "status_notes": t.get("status_notes"),
            "promised_date": str(t["promised_date"]) if t.get("promised_date") else None,
            "attempt_count": t.get("attempt_count", 0),
            "calls": [
                {
                    "date": str(c["started_at"]),
                    "end_date": str(c["ended_at"]) if c.get("ended_at") else None,
                    "status": c["status"],
                    "duration_seconds": c.get("duration_seconds"),
                    "ai_result": c.get("ai_status_result"),
                    "summary": c.get("summary"),
                    "ai_notes": c.get("ai_notes"),
                    "transcript": c.get("transcript"),
                    "error": c.get("error_message"),
                }
                for c in calls.data
            ],
            "messages": [
                {
                    "date": str(m["created_at"]),
                    "channel": m["channel"],
                    "content": m["content"],
                    "status": m["status"],
                }
                for m in messages.data
            ] if messages.data else [],
        })

    c = campaign.data[0]
    return {
        "campaign": {
            "name": c["name"],
            "status": c["status"],
            "created_at": str(c["created_at"]),
        },
        "agency": agency_info,
        "generated_at": datetime.now(timezone.utc).isoformat() if True else "",
        "tenant_count": len(report_tenants),
        "tenants": report_tenants,
    }


@router.get("/{campaign_id}/export-csv")
async def export_campaign_csv(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    """Export campaign results as a CSV file."""
    db = get_supabase()

    campaign = db.table("campaigns").select("name").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    tenants = db.table("tenants").select("*").eq("campaign_id", campaign_id).order("name").execute()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Nom", "Téléphone", "Email", "Adresse", "Montant dû (€)", "Échéance",
        "Statut", "Notes IA", "Date promise", "Tentatives", "Dernier appel",
    ])

    status_labels = {
        "pending": "En attente", "will_pay": "Va payer", "cant_pay": "Difficultés",
        "no_answer": "Pas de réponse", "voicemail": "Répondeur", "bad_number": "Mauvais n°",
        "busy": "Occupé", "refuses": "Refuse", "call_dropped": "Appel coupé",
        "paid": "Payé", "escalated": "Escaladé",
    }

    for t in tenants.data:
        writer.writerow([
            t["name"],
            t["phone"],
            t.get("email", ""),
            t["property_address"],
            t["amount_due"],
            str(t["due_date"]),
            status_labels.get(t["status"], t["status"]),
            t.get("status_notes", ""),
            str(t["promised_date"]) if t.get("promised_date") else "",
            t.get("attempt_count", 0),
            str(t["last_called_at"]) if t.get("last_called_at") else "",
        ])

    output.seek(0)
    safe_name = campaign.data[0]["name"].replace(" ", "_").replace("/", "-")
    filename = f"Recovia_{safe_name}_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str, agency_id: str = Depends(get_current_agency_id)):
    """Stats détaillées pour le résumé de campagne."""
    db = get_supabase()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    tenants = db.table("tenants").select("status, amount_due, promised_date, last_called_at").eq("campaign_id", campaign_id).execute()
    if not tenants.data:
        return {"total": 0}

    data = tenants.data
    total = len(data)

    by_status = {}
    for t in data:
        s = t["status"]
        by_status[s] = by_status.get(s, 0) + 1

    total_due = sum(t["amount_due"] for t in data)
    recoverable = sum(t["amount_due"] for t in data if t["status"] == "will_pay")
    lost = sum(t["amount_due"] for t in data if t["status"] in ("refuses", "escalated"))

    calls = db.table("calls").select("duration_seconds, status").eq("campaign_id", campaign_id).execute()
    total_calls = len(calls.data) if calls.data else 0
    total_duration = sum(c.get("duration_seconds", 0) or 0 for c in (calls.data or []))
    avg_duration = round(total_duration / total_calls) if total_calls > 0 else 0

    return {
        "total": total,
        "by_status": by_status,
        "total_due": total_due,
        "recoverable": recoverable,
        "lost": lost,
        "total_calls": total_calls,
        "total_duration_seconds": total_duration,
        "avg_call_duration_seconds": avg_duration,
        "success_rate": round(by_status.get("will_pay", 0) / total * 100) if total > 0 else 0,
        "contact_rate": round((total - by_status.get("no_answer", 0) - by_status.get("pending", 0)) / total * 100) if total > 0 else 0,
    }


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
        scheduled_at=str(c["scheduled_at"]) if c.get("scheduled_at") else None,
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
