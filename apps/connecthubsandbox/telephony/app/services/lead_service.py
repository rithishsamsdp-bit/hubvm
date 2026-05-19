from fastapi import status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import lead_repo
import  jwt
import csv
from fastapi import HTTPException
import boto3
import botocore
from config import settings
import asyncio
from producer.kafkaproducer import send_message

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

S3_BUCKET = "connecthub3m"
S3_REGION = "ap-south-1"
S3_FOLDER = "PredectiveLeads/"
s3 = boto3.client("s3", region_name=S3_REGION, aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)

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

async def upload(campaign_id: int, file, account_id: int, account_no: str, database: str):
    campaign = await lead_repo.getcampaigndetails(campaign_id, account_id, database)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        s3_key = f"{S3_FOLDER}{account_id}/{file.filename}"
        await asyncio.to_thread(s3.upload_fileobj, file.file, S3_BUCKET, s3_key)
        link = f"https://connecthub3m.s3.ap-south-1.amazonaws.com/{s3_key}"
        data = {
                "type": "PredectiveLeadUpload",
                "accountId": account_id,
                "accountNo": account_no,
                "campaignId": campaign_id,
                "s3Link": link,
                "fileName": file.filename
            }
        await send_message("longrunning-topic", "PredectivLeadUpload", data)
        return {
                "message": "Lead uploaded successfully"
            }
    except botocore.exceptions.BotoCoreError as e:
        raise HTTPException(status_code=500, detail=f"S3 Upload Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")


    
  


    