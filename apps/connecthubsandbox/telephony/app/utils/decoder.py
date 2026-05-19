from models import dto
from typing import Optional
import jwt
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token_or_request) -> Optional[dto.TokenModel]:
    token = None
    if isinstance(token_or_request, str):
        token = token_or_request
    elif isinstance(token_or_request, Request):
        # Try cookies first
        token = token_or_request.cookies.get('accessToken')
        # Try Authorization header next
        if not token:
            auth_header = token_or_request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"status": "failed", "message": "Authentication token missing"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Expired"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Invalid"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )