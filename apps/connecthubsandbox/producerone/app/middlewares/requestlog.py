from fastapi import Request, Response
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from datetime import datetime
from db.context import get_sync_engine, get_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from models.db import RequestLog

def add_request_logger(app):
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        request_body = await request.body()
        start_time = datetime.utcnow()

        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()

        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        response = Response(
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
        
        async_engine = get_async_engine('ondb')
        async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
        session = async_session_maker()

        try:
            requestlog = RequestLog()
            requestlog.r_method = request.method
            requestlog.r_url = str(request.url)
            requestlog.r_requestBody = request_body.decode("utf-8", errors="ignore")
            requestlog.r_responseBody = response_body.decode("utf-8", errors="ignore")
            requestlog.r_statusCode = response.status_code
            requestlog.r_duration = duration
            session.add(requestlog)
            try:
                await session.commit()
                await session.close()
                return response
            except IntegrityError as e:
                await session.rollback()
                await session.close()
                return str(e.orig)
        finally:
            await session.close()
            await async_engine.dispose()