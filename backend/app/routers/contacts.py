from fastapi import APIRouter, Depends, Query
from typing import Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

from app.database import get_supabase
from app.routers.deps import get_current_agency_id

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
async def list_contacts(
    agency_id: str = Depends(get_current_agency_id),
    search: Optional[str] = Query(None, description="Recherche par nom, téléphone ou adresse"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
):
    """Tous les locataires de l'agence, regroupés par numéro de téléphone."""
    db = get_supabase()

    campaigns = db.table("campaigns").select("id, name").eq("agency_id", agency_id).execute()
    if not campaigns.data:
        return []

    campaign_ids = [c["id"] for c in campaigns.data]
    campaign_names = {c["id"]: c["name"] for c in campaigns.data}

    all_tenants = []
    for cid in campaign_ids:
        query = db.table("tenants").select(
            "id, name, phone, email, property_address, amount_due, status, "
            "campaign_id, last_called_at, promised_date"
        ).eq("campaign_id", cid)
        if status:
            query = query.eq("status", status)
        tenants = query.execute()
        all_tenants.extend(tenants.data)

    all_calls_by_tenant: dict[str, int] = {}
    for cid in campaign_ids:
        calls = db.table("calls").select("tenant_id").eq("campaign_id", cid).execute()
        for call in calls.data:
            tid = call["tenant_id"]
            all_calls_by_tenant[tid] = all_calls_by_tenant.get(tid, 0) + 1

    grouped: dict[str, list[dict]] = defaultdict(list)
    for t in all_tenants:
        grouped[t["phone"]].append(t)

    contacts = []
    for phone, entries in grouped.items():
        entries.sort(key=lambda x: x.get("last_called_at") or "", reverse=True)
        latest = entries[0]

        total_calls = sum(all_calls_by_tenant.get(e["id"], 0) for e in entries)
        total_amount = sum(e["amount_due"] for e in entries)

        campaign_list = []
        for e in entries:
            campaign_list.append({
                "campaign_id": e["campaign_id"],
                "campaign_name": campaign_names.get(e["campaign_id"], ""),
                "status": e["status"],
                "amount_due": e["amount_due"],
                "promised_date": str(e["promised_date"]) if e.get("promised_date") else None,
            })

        contact = {
            "id": latest["id"],
            "name": latest["name"],
            "phone": phone,
            "email": latest.get("email"),
            "property_address": latest["property_address"],
            "total_campaigns": len(entries),
            "total_calls": total_calls,
            "total_amount_due": total_amount,
            "last_status": latest["status"],
            "last_campaign_name": campaign_names.get(latest["campaign_id"], ""),
            "last_called_at": str(latest["last_called_at"]) if latest.get("last_called_at") else None,
            "campaigns": campaign_list,
        }
        contacts.append(contact)

    contacts.sort(key=lambda x: x["last_called_at"] or "", reverse=True)

    if search:
        search_lower = search.lower()
        contacts = [
            c for c in contacts
            if search_lower in c["name"].lower()
            or search_lower in c["phone"]
            or search_lower in c["property_address"].lower()
        ]

    return contacts
