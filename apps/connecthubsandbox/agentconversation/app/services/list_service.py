from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import list_repo
from typing import Optional
import jwt
from contextlib import asynccontextmanager
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials,messaging
import os

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Invalid"
            }
        )

async def listMembers(accountid: int, accountno: str, memberextensionno: str, database: str):
    return await list_repo.listMembers(accountid, accountno, memberextensionno, database)

async def init_firebase():
    try:
        if not firebase_admin._apps:
            current_dir = os.path.dirname(__file__)
            cred_path = os.path.join(current_dir, "..", "serviceAccountKey.json")
            
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                print(f"Warning: serviceAccountKey.json not found at {cred_path}. Falling back to default credentials.")
                cred = credentials.ApplicationDefault() 
                firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Firebase initialization error: {e}")

async def sendNotificationToAgent(memberextensionno: int, pnprovider: str, database: str):
    token = await list_repo.getMemberFCMToken(memberextensionno, database)
    
    if not token:
        return {"status": "skipped", "message": "No FCM token found or agent is not in SOFTPHONE mode."}

    try:
        # Construct message with data payload and high priority for both Android and iOS
        message = messaging.Message(
            data={
                "type": "incoming_call"
            },
            token=token,
            android=messaging.AndroidConfig(
                priority='high'
            ),
            apns=messaging.APNSConfig(
                headers={
                    'apns-priority': '10'  # 10 means high priority
                },
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        content_available=True, # Used for background updates/voip
                        sound="default"
                    )
                )
            )
        )
        response = messaging.send(message)
        return {"status": "success", "message_id": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}