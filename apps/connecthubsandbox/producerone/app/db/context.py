from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from typing import Generator, Any
from threading import Lock
from models.db import Base
from constants import SYNC_DB_CONNECTION_STRING, ASYNC_DB_CONNECTION_STRING, ASYNC_DB_CONNECTION_STRING2

# engine_registry = {}
# lock = Lock()

def get_sync_session_maker(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600)
    return sessionmaker(bind=sync_engine, expire_on_commit=False)

# def get_sync_engine(database_name: str):
#     with lock:
#         if database_name not in engine_registry:
#             connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
#             engine = create_engine(
#                 connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=20, max_overflow=100)
#             engine_registry[database_name] = engine
#         return engine_registry[database_name]

def get_sync_engine(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return sync_engine

def get_async_session_maker(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=5, max_overflow=10)
    return sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

def get_async_engine(database_name: str):
    key = f"legacy:{database_name}"
    with _lock:
        if key not in _engine_cache:
            connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
            async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=100, max_overflow=50)
            _engine_cache[key] = async_engine
        return _engine_cache[key]

sync_engine = create_engine(SYNC_DB_CONNECTION_STRING, echo=False, pool_pre_ping=True, pool_recycle=3600)
sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)

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
        
def createCustome_db(Myengine) -> None:
    Base.metadata.create_all(Myengine)

_engine_cache: dict[str, AsyncEngine] = {}
_lock = Lock()

def get_async_enginenew(database_name: str) -> AsyncEngine:
    with _lock:
        if database_name not in _engine_cache:
            connection_string = ASYNC_DB_CONNECTION_STRING2.format(db_name=database_name)
            engine = create_async_engine(
                connection_string,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_timeout=10,
                pool_size=100,
                max_overflow=50
            )
            _engine_cache[database_name] = engine
            print(f"not cached {database_name}")
        else:
            print(f"cached {database_name}")
        return _engine_cache[database_name]

def get_sessionmaker(database_name: str):
    """Returns a sessionmaker bound to the cached engine."""
    engine = get_async_enginenew(database_name)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def dispose_engines():
    """Disposes all cached engines (call during FastAPI shutdown)."""
    for engine in _engine_cache.values():
        await engine.dispose()