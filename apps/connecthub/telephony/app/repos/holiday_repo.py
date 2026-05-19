from db.context import get_sync_session_maker
from sqlalchemy import Delete, Update
from models.db import  Holiday
from typing import Optional
from fastapi.responses import JSONResponse
from fastapi import status
from sqlalchemy.exc import IntegrityError


def create_holiday(name: str,start_date: str,end_date: str,msg_enable: str,message: str,audio_enable: str,audio_name: str,database: str) -> Holiday:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as session:
        holiday = Holiday()
        holiday.name = name
        holiday.start_date = start_date
        holiday.end_date = end_date
        holiday.msg_enable = msg_enable
        holiday.message = message
        holiday.audio_enable = audio_enable
        holiday.audio_name = audio_name
        session.add(holiday)
        session.commit()

def update_holiday(name: str,start_date: str,end_date: str,msg_enable: str,message: str,audio_enable: str,audio_name: str,database: str) -> Holiday:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as session:
        session.execute(Update(Holiday).where(Holiday.name == name).values({
            Holiday.name: name,
            Holiday.start_date: start_date,
            Holiday.end_date: end_date,
            Holiday.msg_enable: msg_enable,
            Holiday.message: message,
            Holiday.audio_enable: audio_enable,
            Holiday.audio_name: audio_name
        }))
        session.commit()
        
def delete_holiday(name:str,database: str) -> Holiday:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as session:
        session.execute(Delete(Holiday).where(Holiday.name == name))
        session.commit()
    
def get_holiday_by_name(name: str,database: str) -> Holiday:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as session:
        return session.query(Holiday).filter(Holiday.name == name).first()
        
        