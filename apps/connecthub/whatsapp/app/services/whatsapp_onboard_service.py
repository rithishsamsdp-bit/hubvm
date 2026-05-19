from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from repos import whatsapp_onboard_repo
from models.dto import WhatsAppCreateRequest, TokenModel
from config import settings
import jwt

def decode(token: str):
    try:
        token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def create(request: WhatsAppCreateRequest, database: str):
    return await whatsapp_onboard_repo.create(request, database)

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str):
    return await whatsapp_onboard_repo.fetch(limit, offset, sortField, sortOrder, searchString, database)
async def update(request: WhatsAppCreateRequest, database: str):
    return await whatsapp_onboard_repo.update(request, database)
