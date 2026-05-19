from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from services import dashboard_service

router = APIRouter(
    prefix="/agent/dashboard",
    tags=["Dashboard"]
)

@router.get("/fetch", status_code=status.HTTP_200_OK)
async def statsfetch(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Access token not found"}
        )
    
    data = dashboard_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await dashboard_service.statsfetch(
            data.m_accountId, 
            data.m_accountNo, 
            data.m_memberExtensionNo,  
            'onedb'  
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Statistics Fetched Successfully",
                "data": result
            }
        )
        
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": e.detail}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"}
        )

@router.get("/live-queues", status_code=status.HTTP_200_OK)
async def fetch_live_queues(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Access token not found"}
        )
    
    data = dashboard_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await dashboard_service.fetch_live_queues(
            data.m_accountNo,
            data.m_memberId,
            'onedb'
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Live Queues Fetched Successfully",
                "data": result
            }
        )
        
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": e.detail}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"}
        )