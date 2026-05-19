from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import dashboard_repo
from typing import Optional
import jwt

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str) -> Optional[dto.TokenModel]:
    """
    Decode JWT token and return token data or error response
    """
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
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

async def statsfetch(accountid: int, accountno: str, member_extension_no: str, database: str):
    """
    Fetch agent statistics filtered by account ID, account number, and member extension number
    
    Args:
        accountid: Account ID from token
        accountno: Account number from token
        member_extension_no: Member extension number (agent's extension) from token
        database: Database name to query
        
    Returns:
        Dictionary containing all dashboard statistics
    """
    result = await dashboard_repo.statsfetch(accountid, accountno, member_extension_no, database)
    return result

async def fetch_live_queues(accountno: str, member_id: int, database: str):
    """
    Fetch live waiting queues statistics filtered by agent
    """
    return await dashboard_repo.fetch_live_queues(accountno, member_id, database)