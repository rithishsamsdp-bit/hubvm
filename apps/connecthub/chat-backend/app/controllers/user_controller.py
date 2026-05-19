# controllers/user_controller.py — REST endpoints for users
from fastapi import APIRouter, Depends, HTTPException
from middlewares.auth_middleware import get_current_user, CurrentUser
from db.context import get_chat_session
from repos import user_repo

router = APIRouter(prefix="/chat/users", tags=["Chat Users"])


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Sync current user into chat_users table and return their profile.
    Called on app load to ensure the record exists.
    """
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        user = await user_repo.upsert_user(session, {
            "member_id":    current_user.member_id,
            "extension_no": current_user.extension_no,
            "member_name":  current_user.member_name,
            "member_role":  current_user.member_role,
            "account_code": current_user.account_code,
        })
        return {
            "success": True,
            "data": {
                "userId":      user.u_userId,
                "memberId":    user.u_memberId,
                "name":        user.u_memberName,
                "role":        user.u_memberRole,
                "status":      user.u_status,
                "lastSeen":    str(user.u_lastSeen) if user.u_lastSeen else None,
                "accountCode": user.u_accountCode,
            }
        }


@router.get("/list")
async def list_users(current_user: CurrentUser = Depends(get_current_user)):
    """
    Return all users in the same account/tenant.
    Used for starting new 1-to-1 chats and adding group members.
    """
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        users = await user_repo.get_users_by_account(session, current_user.account_code)
        return {
            "success": True,
            "data": [
                {
                    "userId":   u.u_userId,
                    "memberId": u.u_memberId,
                    "name":     u.u_memberName,
                    "role":     u.u_memberRole,
                    "status":   u.u_status,
                    "lastSeen": str(u.u_lastSeen) if u.u_lastSeen else None,
                }
                for u in users
            ]
        }
