import json
from db.context import get_async_session_maker
from models.db import ApiLog
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

class DBLogger:
    def __init__(self, database: str):
        self.async_session_maker = get_async_session_maker(database)

    async def log_request(
        self, request_id, client_ip, client_host, regId, agentId, comp_code, user_name, encrypt, phLogin, 
        method, path, headers, content_type, request_data, file_uploads, status_code, response_body, request_time_t, response_time_t, duration
    ):
        session: AsyncSession = self.async_session_maker()
        try:
            query = select(ApiLog).filter(ApiLog.request_id == request_id, ApiLog.log_type == 'request')
            result = await session.execute(query)
            log_entry = result.scalar_one_or_none()

            if log_entry:
                log_entry.status_code = status_code
                log_entry.response_body = response_body
                log_entry.response_time = response_time_t
                log_entry.duration = duration
                log_entry.log_type = 'response'
            else:
                log_entry = ApiLog(
                    request_id=request_id,
                    client_ip=client_ip,
                    client_host=client_host,
                    regId=regId,
                    agentId=agentId,
                    comp_code=comp_code,
                    user_name=user_name,
                    encrypt=encrypt,
                    phLogin=phLogin,
                    method=method,
                    path=path,
                    headers=json.dumps(headers),
                    content_type=content_type,
                    request_data=json.dumps(request_data) if request_data else None,
                    file_uploads=json.dumps(file_uploads) if file_uploads else None,
                    status_code=None,
                    response_body=None,
                    request_time=request_time_t,
                    response_time=None,
                    duration=None,
                    log_type='request'
                )
                session.add(log_entry)

            await session.commit()
        except IntegrityError as e:
            await session.rollback()
            print(f"Database logging failed: {e}")
        finally:
            await session.close()  # ✅ Always close the session
