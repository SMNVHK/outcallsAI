from fastapi import Header, HTTPException
from jose import jwt
from app.config import get_settings


def verify_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


async def get_current_agency_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Format d'autorisation invalide")
    token = authorization.removeprefix("Bearer ")
    payload = verify_token(token)
    return payload["sub"]
