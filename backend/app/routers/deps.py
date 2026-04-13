from fastapi import Header, HTTPException
from app.routers.auth import verify_token


async def get_current_agency_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Format d'autorisation invalide")
    token = authorization.removeprefix("Bearer ")
    payload = verify_token(token)
    return payload["sub"]
