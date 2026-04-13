from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

from app.models import AgencyRegister, AgencyLogin, TokenResponse
from app.database import get_supabase
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(agency_id: str, agency_name: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": agency_id,
        "name": agency_name,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


@router.post("/register", response_model=TokenResponse)
async def register(data: AgencyRegister):
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
async def login(data: AgencyLogin):
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
