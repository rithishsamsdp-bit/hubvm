import json
import io
import time
import uuid
from fastapi import Request
from datetime import datetime
from services import logger_service
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from utils.logger import DBLogger

class LogRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "Unknown"

        token = request.cookies.get("accessToken")
        data = logger_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        body = await request.body()
        content_type = request.headers.get("content-type", "")
        request_data = None
        file_info = []

        if "multipart/form-data" in content_type:
            form_data = await request.form()
            for key, value in form_data.items():
                if hasattr(value, "filename"):
                    file_info.append({
                        "field": key,
                        "filename": value.filename,
                        "content_type": value.content_type,
                        "size": value.file.__sizeof__()
                    })
                else:
                    request_data = request_data or {}
                    request_data[key] = value

        elif "application/json" in content_type:
            try:
                request_data = json.loads(body.decode())
            except json.JSONDecodeError:
                request_data = "[Invalid JSON]"

        request_id = str(uuid.uuid4())

        db_logger = DBLogger(database="connecthub")

        request_time = time.time()
        request_time_t = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        
        client_host = request.headers.get("host", "Unknown")

        filtered_headers = {
            key: value for key, value in request.headers.items() 
            if key.lower() in ["host", "content-type", "user-agent"]
        }

        await db_logger.log_request(
            request_id,
            client_ip, 
            client_host,
            getattr(data, "a_regId", "Api-data"), 
            getattr(data, "a_agentId", "Api-data"), 
            getattr(data, "a_companyCode", "Api-data"), 
            getattr(data, "a_userName", "Api-data"), 
            getattr(data, "encryption", "Api-data"), 
            getattr(data, "a_phLogin", "Api-data"),
            request.method, request.url.path, filtered_headers,
            content_type, request_data, file_info if file_info else None,
            None, None, request_time_t, None, None
        )

        async def request_stream():
            yield body

        request = Request(request.scope, receive=request_stream)
        response = await call_next(request)

        response_body = [section async for section in response.body_iterator]
        response_data = b"".join(response_body).decode(errors="ignore")

        response_time = time.time()
        duration = round(response_time - request_time, 4)
        response_time_t = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')

        filtered_headers = {
            key: value for key, value in request.headers.items() 
            if key.lower() in ["host", "content-type", "user-agent"]
        }

        response_data = json.dumps(response_data) 
        max_response_length = 1000
        if len(response_data) > max_response_length:
            response_data = response_data[:max_response_length] + " ...More data..."

        await db_logger.log_request(
            request_id,
            client_ip, 
            client_host,
            getattr(data, "a_regId", "Api-data"), 
            getattr(data, "a_agentId", "Api-data"), 
            getattr(data, "a_companyCode", "Api-data"), 
            getattr(data, "a_userName", "Api-data"), 
            getattr(data, "encryption", "Api-data"), 
            getattr(data, "a_phLogin", "Api-data"),
            request.method, request.url.path, filtered_headers,
            content_type, request_data, file_info if file_info else None,
            response.status_code, response_data, request_time_t, response_time_t, duration
        )

        final_response = StreamingResponse(io.BytesIO(b"".join(response_body)), media_type=response.media_type, status_code=response.status_code)
        for key, value in response.headers.items():
            final_response.headers[key] = value
        return final_response