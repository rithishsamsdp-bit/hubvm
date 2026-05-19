from fastapi import Request, HTTPException
from utils import decoder
from fastapi.responses import JSONResponse

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, request: Request):

        token = request.cookies.get('accessToken')

        print(request)
        data = decoder.decode(token)
        if isinstance(data, JSONResponse):
            return data
        user_role = data.m_memberRole
        if user_role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied")

        return True