from fastapi import APIRouter
from fastapi import Query
from fastapi import Path
from fastapi import status
from fastapi import Response
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from models import dto
from services import b_hours_service
from sqlalchemy.exc import IntegrityError
from typing import Dict

router = APIRouter(
    prefix="/holiday",
    tags=["Holidays"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/createshift", status_code=status.HTTP_201_CREATED, response_model=Dict[str,str])
async def create_shift(request: dto.ShiftCreateRequest, token: str = Depends(oauth2_scheme))-> Dict[str, str]:
    data = b_hours_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        b_hours_service.create_shift_with_days_and_times(request.dict(),data.encryption)
        return {"status": "success", "message": "Shift created successfully with days and times."}

@router.post("/deleteshift", status_code=status.HTTP_200_OK)
async def delete_shift(request: dto.ShiftDeleteRequest, token: str = Depends(oauth2_scheme)):
    data = b_hours_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        b_hours_service.delete_shift(request.display_name,data.encryption)
        return {"status": "success", "message": "Shift deleted successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/createhour", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_hour(request: dto.HourCreateRequest, token: str = Depends(oauth2_scheme)):
    data = b_hours_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        b_hours_service.create_hour_for_existing_shift_and_day(request,data.encryption)
        return {"status": "success", "message": "Hours created successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

    
@router.post("/deletehour", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_hour(request: dto.HourDeleteRequest, token: str = Depends(oauth2_scheme)):
    data = b_hours_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = b_hours_service.delete_hour_from_shift(request,data.encryption)
        return {"status": "success", "message": "Hour deleted successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")