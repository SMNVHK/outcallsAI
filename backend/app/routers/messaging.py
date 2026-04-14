from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.database import get_supabase
from app.routers.deps import get_current_agency_id
from app.services.sms import send_sms
from app.services.email import send_email, build_reminder_email

router = APIRouter(prefix="/messaging", tags=["messaging"])


class SMSRequest(BaseModel):
    tenant_id: str
    message: str


class EmailRequest(BaseModel):
    tenant_id: str
    tenant_email: Optional[str] = None


class BulkSMSRequest(BaseModel):
    campaign_id: str
    message: str
    status_filter: Optional[str] = None


@router.post("/sms/send")
async def send_sms_to_tenant(data: SMSRequest, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    tenant = db.table("tenants").select("*, campaigns!inner(agency_id, name)").eq("id", data.tenant_id).execute()
    if not tenant.data or tenant.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")

    t = tenant.data[0]

    if len(data.message) > 480:
        raise HTTPException(status_code=400, detail="Message trop long (max 480 caractères, 3 SMS)")

    result = await send_sms(t["phone"], data.message)

    db.table("tenant_messages").insert({
        "tenant_id": data.tenant_id,
        "campaign_id": t["campaign_id"],
        "channel": "sms",
        "content": data.message,
        "status": "sent" if result["success"] else "failed",
        "external_id": result.get("message_id"),
        "error": result.get("error"),
    }).execute()

    if not result["success"]:
        raise HTTPException(status_code=502, detail=f"Échec envoi SMS: {result.get('error', 'Erreur inconnue')}")

    return {"message": "SMS envoyé", "message_id": result["message_id"]}


@router.post("/sms/bulk")
async def send_bulk_sms(data: BulkSMSRequest, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    campaign = db.table("campaigns").select("id").eq("id", data.campaign_id).eq("agency_id", agency_id).execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campagne introuvable")

    query = db.table("tenants").select("id, name, phone").eq("campaign_id", data.campaign_id)
    if data.status_filter:
        query = query.eq("status", data.status_filter)
    tenants = query.execute()

    if not tenants.data:
        raise HTTPException(status_code=400, detail="Aucun locataire à contacter")

    if len(data.message) > 480:
        raise HTTPException(status_code=400, detail="Message trop long (max 480 caractères)")

    sent = 0
    failed = 0
    for t in tenants.data:
        personalized = data.message.replace("{nom}", t["name"])
        result = await send_sms(t["phone"], personalized)

        db.table("tenant_messages").insert({
            "tenant_id": t["id"],
            "campaign_id": data.campaign_id,
            "channel": "sms",
            "content": personalized,
            "status": "sent" if result["success"] else "failed",
            "external_id": result.get("message_id"),
            "error": result.get("error"),
        }).execute()

        if result["success"]:
            sent += 1
        else:
            failed += 1

    return {"message": f"{sent} SMS envoyés, {failed} échecs", "sent": sent, "failed": failed}


@router.post("/email/send")
async def send_email_to_tenant(data: EmailRequest, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    tenant = db.table("tenants").select("*, campaigns!inner(agency_id, name)").eq("id", data.tenant_id).execute()
    if not tenant.data or tenant.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")

    t = tenant.data[0]
    email_addr = data.tenant_email or t.get("email")
    if not email_addr:
        raise HTTPException(status_code=400, detail="Aucune adresse email pour ce locataire")

    agency = db.table("agencies").select("name").eq("id", agency_id).execute()
    agency_name = agency.data[0]["name"] if agency.data else "Votre agence"

    subject, html, text = build_reminder_email(t["name"], t["amount_due"], str(t["due_date"]), agency_name)
    result = await send_email(email_addr, subject, html, text)

    db.table("tenant_messages").insert({
        "tenant_id": data.tenant_id,
        "campaign_id": t["campaign_id"],
        "channel": "email",
        "content": subject,
        "status": "sent" if result["success"] else "failed",
        "error": result.get("error"),
    }).execute()

    if not result["success"]:
        raise HTTPException(status_code=502, detail=f"Échec envoi email: {result.get('error', 'Erreur inconnue')}")

    return {"message": "Email envoyé"}


@router.get("/history/{tenant_id}")
async def get_message_history(tenant_id: str, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()

    tenant = db.table("tenants").select("id, campaigns!inner(agency_id)").eq("id", tenant_id).execute()
    if not tenant.data or tenant.data[0]["campaigns"]["agency_id"] != agency_id:
        raise HTTPException(status_code=404, detail="Locataire introuvable")

    result = db.table("tenant_messages").select("*").eq("tenant_id", tenant_id).order("created_at", desc=True).execute()
    return result.data
