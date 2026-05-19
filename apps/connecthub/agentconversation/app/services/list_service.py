from fastapi import status
from fastapi.responses import JSONResponse
import httpx
from models import dto
from repos import list_repo
from typing import Optional
import jwt
from contextlib import asynccontextmanager
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials,messaging
import os
import time

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

async def sendNotificationToAgent(memberextensionno: int, pnprovider: str, caller: str, callid: str, reason: str, database: str):
    data = await list_repo.getMemberFCMToken(memberextensionno, database)
    if data:
        devicetoken = data["fcmtoken"]
        ostype = data["ostype"]
    if not devicetoken:
        return {"status": "skipped", "message": "No FCM token found or agent is not in SOFTPHONE mode."}

    try:
        if ostype == "android":
            message = messaging.Message(
                data={
                    "type": "incoming_call",
                    "callerName": caller,
                    "callerId": caller,
                    "callId": callid
                },
                token=devicetoken,
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
            if response.status_code == 200:
                return {"status": "success", "message": "VoIP notification sent"}
            else:
                return {"status": "error", "code": response.status_code, "message": response.text}
        elif ostype == "ios":
            TEAM_ID      = "CFVB685GDQ"
            KEY_ID       = "C3HNF78X5S"
            BUNDLE_ID    = "com.pulse.pulsephone.voip"
            P8_PATH = os.path.join(os.path.dirname(__file__), "..", "AuthKey_C3HNF78X5S.p8")
            with open(P8_PATH, "r") as f:
                private_key = f.read()

            token = jwt.encode(
                    payload={
                        "iss": TEAM_ID,
                        "iat": int(time.time())
                    },
                    key=private_key,
                    algorithm="ES256",
                    headers={"kid": KEY_ID}
                )
            payload = {
                "aps": {},
                "callerName": caller,
                "callerId": caller,
                "uuid": callid
            }
            
            headers = {
                "authorization": f"bearer {token}",
                "apns-topic": BUNDLE_ID,
                "apns-push-type": "voip",
                "apns-priority": "10",
                "content-type": "application/json"
            }
            url = f"https://api.sandbox.push.apple.com/3/device/{devicetoken}"
            print(f"Sending to: {url}")
            print(f"Token length: {len(token)}")
            print(f"Bundle ID: {BUNDLE_ID}")
            print(f"Headers: {headers}")
            print(f"Payload: {payload}")
            with httpx.Client(http2=True) as client:
                response = client.post(url, json=payload, headers=headers)

            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            print(f"Headers: {dict(response.headers)}")

            if response.status_code == 200:
                return {"status": "success", "message": "VoIP notification sent"}
            else:
                return {"status": "error", "code": response.status_code, "message": response.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}
