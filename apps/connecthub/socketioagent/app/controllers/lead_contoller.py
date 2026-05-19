import uuid
import sys
from typing import Union, List
from fastapi import APIRouter,  Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
import logging
from models.dto import LeadCreate, Leaddetails
from services import lead_service

router = APIRouter(
    prefix="/agent/lead",
    tags=["conversation"]
)

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict | Leaddetails)
async def create(request: LeadCreate, tokenRequest: Request, response: Response):
    try:
        l_serviceNo = request.l_serviceNo
        l_leadMobileNumber = request.l_leadMobileNumber
        l_uniqueId = request.l_uniqueId
        l_tasktype =  request.l_tasktype
        
        response =  await lead_service.create(l_serviceNo, l_leadMobileNumber, l_uniqueId, l_tasktype)

        return response
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
    
    

    
    
    