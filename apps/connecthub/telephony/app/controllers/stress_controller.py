import sys
from fastapi import APIRouter,  Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
import logging
from services import stress_service

router = APIRouter(
    prefix="/telephony/test",
    tags=["test"]
)

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create( response: Response):
    try:
        print(Request)
        response = await stress_service.create()
        return response
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    
    except Exception as e:
        return {"status": "error", "detail": str(e)}