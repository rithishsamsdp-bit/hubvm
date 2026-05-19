from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import list_repo
import jwt

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str):
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def ListProxies(database: str):
    return await list_repo.ListProxies(database)

async def ListQueueGroups(accountid: int, accountno: str, database: str):
    return await list_repo.ListQueueGroups(accountid, accountno, database)

async def ExecutionEvents(request: dict, accountid: int, database: str):
    return [
        {
            "eventname": "OUTBOUND_CALL_COMPLETED",
            "allowedvariables": [
                "{{agent_extension}}",
                "{{agent_phone_number}}",
                "{{customer_phone_number}}",
                "{{business_phone_number}}",
                "{{display_phone_number}}",
                "{{call_started_at}}",
                "{{call_ended_at}}",
                "{{call_answered_at}}",
                "{{total_duration_seconds}}",
                "{{talk_duration_seconds}}",
                "{{call_status}}",
                "{{call_direction}}",
                "{{call_ended_by}}",
                "{{recording_url}}",
                "{{call_id}}",
                "{{custom}}"
            ]
        },
        {
            "eventname": "INBOUND_CALL_COMPLETED",
            "allowedvariables": [
                "{{agent_extension}}",
                "{{agent_phone_number}}",
                "{{customer_phone_number}}",
                "{{business_phone_number}}",
                "{{display_phone_number}}",
                "{{call_started_at}}",
                "{{call_ended_at}}",
                "{{call_answered_at}}",
                "{{total_duration_seconds}}",
                "{{talk_duration_seconds}}",
                "{{call_status}}",
                "{{call_direction}}",
                "{{call_ended_by}}",
                "{{recording_url}}",
                "{{call_id}}"
            ]
        }
    ]