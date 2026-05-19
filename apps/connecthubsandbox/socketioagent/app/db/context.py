from typing import Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from models.db import Base
from constants import SYNC_DB_CONNECTION_STRING
from constants import ASYNC_DB_CONNECTION_STRING
from constants import AST_DB_CONNECTION_STRING
import redis.asyncio as redis
if not SYNC_DB_CONNECTION_STRING:
    raise Exception("DB connection string not provided")

if not ASYNC_DB_CONNECTION_STRING:
    raise Exception("DB connection string not provided")

if not AST_DB_CONNECTION_STRING:
    raise Exception("DB connection string not provided")

def create_db() -> None:
    """
    Creates the database tables by calling `Base.metadata.create_all(engine)`.
    """
    Base.metadata.create_all(sync_engine)


def get_db() -> Generator[Session, Any, None]:
    """
    Returns a generator that yields a SQLAlchemy session. This session should be used for all database interactions within the current request context.
    """
    with sync_session_maker() as session:
        yield session
        

def auto_create_db():
    """
    Automatically creates the database if it doesn't already exist.

    This function attempts to connect to the database engine. If an exception is raised, it means the database doesn't exist yet, so it creates the database using the connection string and database name extracted from the `CONNECTION_STRING` variable.

    After creating the database, it calls the `create_db()` function to perform any additional setup or initialization for the database.
    """
    try:
        con = sync_engine.connect()
        create_db()
        con.close()

    except Exception as _:
        connection_string, db_name = SYNC_DB_CONNECTION_STRING.rsplit("/", 1)

        tmp_engine = create_engine(connection_string)
        with tmp_engine.begin() as session:
            session.exec_driver_sql(f"CREATE DATABASE `{db_name}`")

        create_db()
        
def get_sync_session_maker(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600)
    return sessionmaker(bind=sync_engine, expire_on_commit=False)

# Dynamic Async Engine
def get_async_session_maker(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string,pool_size=10,max_overflow=20,pool_pre_ping=True)
    return sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

""" New Updated Database Connection, Kindly Use Below """

def get_sync_engine(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return sync_engine

def get_async_engine(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_redis_client_by_db(db: int = 0):
    print(db)
    # return redis.Redis(
    #         host='testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com',
    #         port=6379,
    #         decode_responses=True,  # This ensures that binary data is decoded
    #     )
    return redis.Redis(
        host="localhost",
        port=6379,
        db=db,
        password="pulse123",
        decode_responses=True  # Returns str instead of bytes
    )