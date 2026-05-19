
from models import dto
from typing import Optional
import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse


SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"
def decode(token: str) -> Optional[dto.TokenModel]:
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