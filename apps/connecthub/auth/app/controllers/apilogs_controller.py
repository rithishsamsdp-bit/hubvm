from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from config import settings
from services import account_service
from repos import apilogs_repo

router = APIRouter(
    prefix="/auth/apilogs",
    tags=["ApiLogs"]
)


@router.post("/fetch", status_code=status.HTTP_200_OK)
async def fetch_api_logs(tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    body = await tokenRequest.json()
    limit = body.get("limit", 10)
    offset = body.get("offset", 0)
    account_id = body.get("account_id")
    pod_name = body.get("pod_name")
    method = body.get("method")
    status_code = body.get("status_code")
    start_date = body.get("start_date")
    end_date = body.get("end_date")

    try:
        result = await apilogs_repo.fetch(
            limit=limit,
            offset=offset,
            account_id=account_id,
            pod_name=pod_name,
            method=method,
            status_code=status_code,
            start_date=start_date,
            end_date=end_date,
            database='onedb',
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "API Logs Fetched Successfully", "data": result}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
