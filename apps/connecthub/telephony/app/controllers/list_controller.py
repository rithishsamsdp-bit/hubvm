from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import ListProxiesResponse, ListQueueGroupsResponse, ExecutionEventsResponse, ExecutionEventsRequest, LocationListResponse
from services import list_service

router = APIRouter(
    prefix="/telephony/list",
    tags=["List"]
)

@router.get("/proxies", status_code=status.HTTP_200_OK, response_model=ListProxiesResponse)
async def ListProxies(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = list_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await list_service.ListProxies('onedb')
        return {
            "message": f"Proxies Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/queuegroups", status_code=status.HTTP_200_OK, response_model=ListQueueGroupsResponse)
async def ListQueueGroups(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = list_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await list_service.ListQueueGroups(data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Queue Groups Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/locations", status_code=status.HTTP_200_OK, response_model=LocationListResponse)
async def listLocations(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = list_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await list_service.listLocations(data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Locations Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/externalintegrationapi/executionevents", status_code=status.HTTP_200_OK, response_model=ExecutionEventsResponse)
async def ExecutionEvents(request: ExecutionEventsRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = list_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await list_service.ExecutionEvents(request, data.m_accountId, 'onedb')
        return {
            "message": f"Execution Events Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})