from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models import AgencyRegister, AgencyLogin, TokenResponse, AgencyProfileResponse, AgencyProfileUpdate
from app.database import get_supabase
from app.config import get_settings
from app.routers.deps import get_current_agency_id

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
limiter = Limiter(key_func=get_remote_address)


def create_token(agency_id: str, agency_name: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": agency_id,
        "name": agency_name,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register(request: Request, data: AgencyRegister):
    db = get_supabase()

    existing = db.table("agencies").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    hashed = pwd_context.hash(data.password)
    result = db.table("agencies").insert({
        "name": data.name,
        "email": data.email,
        "password_hash": hashed,
        "phone": data.phone,
        "caller_id": data.caller_id,
    }).execute()

    agency = result.data[0]
    token = create_token(agency["id"], agency["name"])

    return TokenResponse(
        access_token=token,
        agency_id=agency["id"],
        agency_name=agency["name"],
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: AgencyLogin):
    db = get_supabase()

    result = db.table("agencies").select("*").eq("email", data.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    agency = result.data[0]
    if not pwd_context.verify(data.password, agency["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(agency["id"], agency["name"])

    return TokenResponse(
        access_token=token,
        agency_id=agency["id"],
        agency_name=agency["name"],
    )


@router.get("/profile", response_model=AgencyProfileResponse)
async def get_profile(agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    result = db.table("agencies").select("id, name, email, phone, caller_id, created_at").eq("id", agency_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    a = result.data[0]
    return AgencyProfileResponse(
        id=a["id"],
        name=a["name"],
        email=a["email"],
        phone=a.get("phone"),
        caller_id=a.get("caller_id"),
        created_at=str(a.get("created_at", "")),
    )


@router.put("/profile", response_model=AgencyProfileResponse)
async def update_profile(data: AgencyProfileUpdate, agency_id: str = Depends(get_current_agency_id)):
    db = get_supabase()
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.caller_id is not None:
        update_data["caller_id"] = data.caller_id

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune modification")

    db.table("agencies").update(update_data).eq("id", agency_id).execute()
    result = db.table("agencies").select("id, name, email, phone, caller_id, created_at").eq("id", agency_id).execute()
    a = result.data[0]
    return AgencyProfileResponse(
        id=a["id"],
        name=a["name"],
        email=a["email"],
        phone=a.get("phone"),
        caller_id=a.get("caller_id"),
        created_at=str(a.get("created_at", "")),
    )
