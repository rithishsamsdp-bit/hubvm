from db.context import get_sync_engine
from models.db import Agents, Company
from sqlalchemy.orm import sessionmaker
from typing import Optional

def get_by_companycode(companycode: str, database: str) -> Optional[Company]:
    engine = get_sync_engine(database)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_maker()
    try:
        return session.query(Company).where(
            Company.c_companyCode == companycode
        ).first()
    finally:
        session.close()
        engine.dispose()
    
def get_by_username(username: str, database: str) -> Optional[Agents]:
    engine = get_sync_engine(database)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_maker()
    try:
        return session.query(Agents).where(
            Agents.a_userName == username
        ).first()
    finally:
        session.close()
        engine.dispose()