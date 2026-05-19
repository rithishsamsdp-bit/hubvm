import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from models import db
from models import dto
from repos import b_hours_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"
    
def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Expired"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Invalid"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
def create_shift_with_days_and_times(shift_data: dict,database:str):
    
    display_name = shift_data['display_name'].strip()
    existing_shift = b_hours_repo.get_shift_by_name(display_name,database)
    if existing_shift:
        raise ValueError("Shift with this name already exists.")

    shift = b_hours_repo.create_shift(display_name,database)
    
    for day_data in shift_data['days']:
        day_name = day_data['day_name'].strip()
        day = b_hours_repo.create_day(shift.shift_id, day_name,database)

        for time_data in day_data['times']:
            time_from = time_data['time_from'].strip()
            time_to = time_data['time_to'].strip()
            b_hours_repo.create_hour(day.day_id, time_from, time_to,database)
        
def delete_shift(display_name: str,database:str):
    existing_shift = b_hours_repo.get_shift_by_name(display_name,database)
    if not existing_shift:
        raise ValueError("Shift with this name does not exist.")
    b_hours_repo.delete_shift_by_name(display_name,database)

def create_hour_for_existing_shift_and_day(hour_data: dto.HourCreateRequest,database:str):
    shift = b_hours_repo.get_shift_by_name(hour_data.display_name,database)
    if not shift:
        raise ValueError(f"Shift with name '{hour_data.display_name}' does not exist.")
    
    day = b_hours_repo.get_day_by_name(shift.shift_id, hour_data.day_name,database)
    if not day:
        raise ValueError(f"Day '{hour_data.day_name}' does not exist for shift '{hour_data.display_name}'.")

    for time_data in hour_data.times:
        b_hours_repo.create_hour(day.day_id, time_data.time_from, time_data.time_to,database)
    
def delete_hour_from_shift(hour_delete_request: dto.HourDeleteRequest,database:str) -> dict:
    display_name = hour_delete_request.display_name.strip()
    day_name = hour_delete_request.day_name.strip()
    time_from = hour_delete_request.time_from.strip()
    time_to = hour_delete_request.time_to.strip()

    shift = b_hours_repo.get_shift_by_name(display_name,database)
    if not shift:
        raise ValueError("Shift with the given name does not exist.")
    
    day = b_hours_repo.get_day_by_name_and_shift_id(day_name, shift.shift_id,database)
    if not day:
        raise ValueError("Day with the given name does not exist in this shift.")
    
    hour_deleted = b_hours_repo.delete_hour(day.day_id, time_from, time_to,database)
    if not hour_deleted:
        raise ValueError("The specified hour was not found.")

    return {"status": "success", "message": "Hour deleted successfully."}