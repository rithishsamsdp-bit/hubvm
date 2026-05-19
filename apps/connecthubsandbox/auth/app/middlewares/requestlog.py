from fastapi import Request, Response
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from db.context import asyncSessionFactory
from models.db import RequestLog
from datetime import datetime

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
        
        sessionmaker = asyncSessionFactory('ondb')
        async with sessionmaker() as session:
            try:
                requestlog = RequestLog()
                requestlog.r_method = request.method
                requestlog.r_url = str(request.url)
                requestlog.r_requestBody = request_body.decode("utf-8", errors="ignore")
                requestlog.r_responseBody = response_body.decode("utf-8", errors="ignore")
                requestlog.r_statusCode = response.status_code
                requestlog.r_duration = duration
                session.add(requestlog)
                await session.commit()
                return response
            except IntegrityError as e:
                await session.rollback()
                return str(e.orig)
            except SQLAlchemyError as e:
                await session.rollback()
                return {str(e)}
            except Exception as e:
                await session.rollback()
                return {str(e)}