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
from services import holiday_service
from sqlalchemy.exc import IntegrityError

router = APIRouter(
    prefix="/holiday",
    tags=["Holidays"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def add_holiday(request: dto.HolidayCreateRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = holiday_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        existing_holiday = holiday_service.get_holiday_by_name(request.name,data.encryption) 
        if existing_holiday:
            return {"status": "failed", "message": "Holiday with this name already exists."}
        else:
            holiday_service.create_holiday(
                request.name,
                request.start_date,
                request.end_date ,
                request.msg_enable ,
                request.message,
                request.audio_enable ,
                request.audio_name,
                data.encryption,
            )
            return {"status": "success", "message": "success"}
    except IntegrityError:
        return{"status": "failed", "message": "Holiday with this name already exists."}

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def up_holiday(request: dto.HolidayUpdateRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = holiday_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        holiday_service.update_holiday(
            request.name,
            request.start_date,
            request.end_date ,
            request.msg_enable ,
            request.message,
            request.audio_enable ,
            request.audio_name,
            data.encryption
        )
        return {"status": "success", "message": "success"}
    
@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def del_holiday(request: dto.HolidayDeleteRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = holiday_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        holiday_service.delete_holiday(
            request.name,
            data.encryption
        )
        return {"status": "success", "message": "success"}