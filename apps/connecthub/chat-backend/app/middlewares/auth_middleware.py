# middlewares/auth_middleware.py
# JWT validation FastAPI dependency — reads the same `accessToken` cookie
# used by all other ConnectHub services (same secret, same algorithm).

from fastapi import Request, HTTPException, status
from config import settings
import jwt

class CurrentUser:
    """Parsed JWT payload available to all route handlers."""
    def __init__(self, payload: dict):
        self.member_id      = payload.get("m_memberId")
        self.extension_no   = payload.get("m_memberExtensionNo")
        self.member_name    = payload.get("m_memberName", "Unknown")
        self.member_role    = payload.get("m_memberRole", "USER")
        self.account_code   = payload.get("m_accountCode", "")
        self.account_id     = payload.get("m_accountId")


async def get_current_user(request: Request) -> CurrentUser:
    """
    FastAPI dependency: extracts & verifies the accessToken cookie.
    Raises 401 if missing or invalid.
    """
    token = request.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    try:
        payload = jwt.decode(
            token,
            settings.AUTH_TOKEN_SECRET_KEY,
            algorithms=[settings.AUTH_TOKEN_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return CurrentUser(payload)


def require_role(*roles: str):
    """
    Role-guard dependency factory.
    Usage: Depends(require_role("ADMIN", "SUPERADMIN"))
    """
    async def _guard(request: Request) -> CurrentUser:
        user = await get_current_user(request)
        if user.member_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to roles: {', '.join(roles)}"
            )
        return user
    return _guard
