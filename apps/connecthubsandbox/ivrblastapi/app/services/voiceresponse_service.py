import os, jwt, boto3
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import voiceresponse_repo
from datetime import datetime
from typing import Optional

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def encode(userdetails: dict, exp: datetime, encryption) -> str:
    token = dto.TokenModel(
        a_agentId = userdetails.a_agentId,
        a_regId = userdetails.a_regId,
        a_companyCode = userdetails.a_companyCode,
        a_userName = userdetails.a_userName,
        a_password = userdetails.a_password,
        a_phLogin = userdetails.a_phLogin,
        a_campaignId = userdetails.a_campaignId,
        a_mode = userdetails.a_mode,
        a_platFormType = userdetails.a_platFormType,
        a_role = userdetails.a_role,
        a_callerId = userdetails.a_callerId,
        a_mailId = userdetails.a_mailId,
        a_loginStatus = userdetails.a_loginStatus,
        a_context = userdetails.a_context,
        a_passwordHash = userdetails.a_passwordHash,
        a_mobileNumber = userdetails.a_mobileNumber,
        a_uniqueid = userdetails.a_uniqueid,
        a_calltype = userdetails.a_calltype,
        a_confdetails = userdetails.a_confdetails,
        exp=exp,
        encryption = encryption
    )
    return jwt.encode(token.model_dump(), SECRET_KEY, algorithm=ALGORITHM)
    
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

async def S3Upload(wav_file_path: str, filename: str, encryption: str):
    try:
        S3_BUCKET_NAME = "connecthubv2"
        S3_REGION = "ap-south-1"
        s3_client = boto3.client('s3', region_name=S3_REGION)
        s3_client.upload_file(
            Filename=wav_file_path,
            Bucket=S3_BUCKET_NAME,
            Key=f"{encryption}/{filename}.wav",
        )
        os.remove(wav_file_path)
    except Exception as e:
        os.remove(wav_file_path)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"File Upload Failed"
            }
        )

async def S3Delete(filename: str, encryption: str):
    try:
        S3_BUCKET_NAME = "connecthubv2"
        S3_REGION = "ap-south-1"
        s3_client = boto3.client('s3', region_name=S3_REGION)
        s3_client.delete_object(
            Bucket=S3_BUCKET_NAME,
            Key=f"{encryption}/{filename}.wav",
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"File Delete Failed"
            }
        )

async def create(filename: str, database: str):
    filename = filename.strip()
    database = database
    objecturl = f"https://connecthubv2.s3.ap-south-1.amazonaws.com/{database}/{filename}.wav"
    return await voiceresponse_repo.create(filename, database, objecturl)

async def delete(voiceresponseid: int, voiceresponsename: str, database: str):
    voiceresponseid = voiceresponseid
    voiceresponsename = voiceresponsename.strip()
    database = database
    await voiceresponse_repo.delete(voiceresponseid, voiceresponsename, database)

def fetch(limit: int, offset: int, searchString: any, database: str) -> dict:
    return voiceresponse_repo.fetch(limit=limit, offset=offset, searchString=searchString, database=database)

def check(voiceresponsename: str, database: str) -> dict:
    result = voiceresponse_repo.check(voiceresponsename=voiceresponsename, database=database)
    return result