import os
import jwt
from fastapi import Request, Response
from db.context import asyncSessionFactory
from models.db import RequestLog
from datetime import datetime
from config import settings

def add_request_logger(app):
    pod_name = os.environ.get('POD_NAME', os.environ.get('HOSTNAME', 'unknown'))

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        if request.headers.get('upgrade', '').lower() == 'websocket':
            return await call_next(request)

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

        account_id = None
        try:
            token = request.cookies.get(settings.AUTH_TOKEN_NAME)
            if token:
                token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
                account_id = token_data.get('m_accountId')
        except Exception:
            pass

        sessionmaker = asyncSessionFactory('onedb')
        async with sessionmaker() as session:
            try:
                requestlog = RequestLog()
                requestlog.r_method = request.method
                requestlog.r_url = str(request.url)
                requestlog.r_requestBody = request_body.decode("utf-8", errors="ignore")
                requestlog.r_responseBody = response_body.decode("utf-8", errors="ignore")
                requestlog.r_statusCode = response.status_code
                requestlog.r_duration = duration
                requestlog.r_account_id = account_id
                requestlog.r_pod_name = pod_name
                session.add(requestlog)
                await session.commit()
            except Exception as e:
                await session.rollback()
                print("Request logging error:", str(e))
        return response
