"""
Database context for EmergencyIVR pod.
Provides async MySQL engine and MongoDB client factories.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings
import pymongo
import logging

logger = logging.getLogger("emergency-ivr-db")

_async_engine = None
_mongo_client = None


def get_async_engine():
    global _async_engine
    if _async_engine is None and settings.ASYNC_CODEX_TETHER_SPELL:
        # EmergencyIVR image uses aiomysql instead of asyncmy
        # The connection string contains a {codex} placeholder for the database name
        db_url = settings.ASYNC_CODEX_TETHER_SPELL.replace("mysql+asyncmy://", "mysql+aiomysql://").format(codex="onedb")
        _async_engine = create_async_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5
        )
        logger.info("✅ MySQL async engine created")
    return _async_engine


def get_async_session():
    """Returns an async session factory."""
    engine = get_async_engine()
    if not engine:
        return None
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = pymongo.MongoClient(
            settings.MONGO_URI,
            tls=True,
            tlsAllowInvalidCertificates=True,
            connectTimeoutMS=20000
        )
        logger.info("✅ MongoDB client created")
    return _mongo_client


def get_mongo_db(db_name="onedb"):
    return get_mongo_client()[db_name]
