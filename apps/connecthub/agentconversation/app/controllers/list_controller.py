from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import ListMembersResponse
from services import list_service

router = APIRouter(
    prefix="/agent/list",
    tags=["List"]
)

@router.get("/members", status_code=status.HTTP_200_OK, response_model=ListMembersResponse)
async def listMembers(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = list_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await list_service.listMembers(data.m_accountId, data.m_accountNo,  data.m_memberExtensionNo, 'onedb')
        return {
            "message": f"Members Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/notify", status_code=status.HTTP_200_OK)
async def notifyAgent(request: Request):
    try:
        # Assuming request body contains 'agent_extension', 'title', 'body'
        # Request body: {"agent_extension": "1001"}
        body = await request.json()
        target_extension = body.get("agentextension")
        pnprovider = body.get("pnprovider")
        caller = body.get("caller")
        callid = body.get("callid")
        reason = body.get("reason")

        # Removed cookie validation as per user request
        
        result = await list_service.sendNotificationToAgent(target_extension, pnprovider, caller, callid, reason, 'onedb')
        
        return {
            "message": "Notification process completed",
            "data": result
        }
    except Exception as e:
         return JSONResponse(status_code=500, content={"message": str(e)})