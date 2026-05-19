from db.context import get_sync_session_maker
from sqlalchemy import Delete, Update
from models.db import  Shift, Days, Hours
from typing import Optional

def create_shift(display_name : str,database: str) -> Shift:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        shift = Shift()
        shift.display_name = display_name
        sync_session.add(shift)
        sync_session.commit()
        return shift

def delete_shift_by_name(display_name: str,database: str):
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        sync_session.execute(Delete(Shift).where(Shift.display_name == display_name))
        sync_session.commit()

def get_shift_by_name(display_name: str,database: str) -> Shift:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        return sync_session.query(Shift).filter(Shift.display_name == display_name).first()

def get_day_by_name(shift_id: int, day_name: str,database: str) -> Days:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        return sync_session.query(Days).filter(Days.shift_id == shift_id, Days.day_name == day_name).first()

def get_day_by_name_and_shift_id(day_name: str, shift_id: int,database: str) -> Optional[Days]:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        day = sync_session.query(Days).filter(
            Days.day_name == day_name, Days.shift_id == shift_id
        ).first()  
        return day 
    
def create_day(shift_id: int, day_name : str,database: str) -> Days:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        days = Days()
        days.day_name = day_name
        days.shift_id = shift_id
        sync_session.add(days)
        sync_session.commit()
        return days

def create_hour(day_id: int, time_from : str, time_to : str,database: str) -> Hours:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        hours = Hours()
        hours.time_from = time_from
        hours.time_to = time_to
        hours.day_id = day_id
        sync_session.add(hours)
        sync_session.commit()
        return hours
        
def delete_hour(day_id: int, time_from: str, time_to: str,database: str) -> Hours:
    sync_session_maker = get_sync_session_maker(database)
    with sync_session_maker() as sync_session:
        hour_to_delete = sync_session.query(Hours).filter(
            Hours.day_id == day_id, Hours.time_from == time_from, Hours.time_to == time_to
        ).first()

        if hour_to_delete:
            sync_session.delete(hour_to_delete)
            sync_session.commit()
            return hour_to_delete
        return None