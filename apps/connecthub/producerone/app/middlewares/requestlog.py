import os
from fastapi import Request, Response
from datetime import datetime
from db.context import get_async_session_maker
from models.db import RequestLog


def add_request_logger(app):
    pod_name = os.environ.get('POD_NAME', os.environ.get('HOSTNAME', 'unknown'))
    _session_maker = get_async_session_maker('onedb')

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

        async with _session_maker() as session:
            try:
                log_entry = RequestLog(
                    r_method=request.method,
                    r_url=str(request.url),
                    r_requestBody=request_body.decode("utf-8", errors="ignore"),
                    r_responseBody=response_body.decode("utf-8", errors="ignore"),
                    r_statusCode=response.status_code,
                    r_duration=duration,
                    r_account_id=None,
                    r_pod_name=pod_name,
                )
                session.add(log_entry)
                await session.commit()
            except Exception as e:
                await session.rollback()
                print("Request logging error:", str(e))

        return response
