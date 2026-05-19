import jwt
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel
from models import db
from models import dto
from repos import whatsapp_template_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional

def decode(token: str):
    try:
        token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
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
    
async def create_whatsapp_template(tempName : str,tempCategory : str,selectLan : str,headerType : str,headerValue : str,mediaType : str,mediaExtType : str,bodyContent : str,footerContent : str,btnType : str,btnNameVm : str,wUrl : str,btnNameCpn : str,phoneNum : str,Phone_Code : str,btn1 : str,btn2 : str,btn3 : str,btn4 : str,btn5 : str,s3_URL:str,database:str,accountId:str,accountNo:str):
    response=await whatsapp_template_repo.createTemplate(tempName,tempCategory,selectLan,headerType,headerValue,mediaType,mediaExtType,bodyContent,footerContent,btnType,btnNameVm,wUrl,btnNameCpn,phoneNum,Phone_Code,btn1,btn2,btn3,btn4,btn5,s3_URL,database,accountId,accountNo)
    
    return response



async def fetch_whatsapp_template(templateId:str,accountId:str,accountNo:str):

    response=await whatsapp_template_repo.fetch_whatsapp_template(templateId,accountId,accountNo)
    
    return response




async def fetch_whatsapp_template_report(limit:int,offset:int,searchString:str,sortField:str,sortOrder:str,accountId:str,accountNo:str):

    response=await whatsapp_template_repo.fetch_whatsapp_template_report(limit,offset,searchString,sortField,sortOrder, accountId, accountNo)
    
    return response


async def send_outbound_messages(s3_URL:str,mediaType:str,message,dst:str,agent:str,database: str,accountId:str,accountNo:str):

    response=await whatsapp_template_repo.send_outbound_messages(s3_URL,mediaType,message,dst,agent,database,accountId,accountNo)
    
    return response


async def callbackApi(data:dict):

    response=await whatsapp_template_repo.callbackApi(data)
    
    return response

async def sendManualTemplate(tempName:str,tempId : str,agent:str,dst:str,accountId:str,accountNo:str,variables:list=[]):

    response=await whatsapp_template_repo.sendManualTemplate(tempName,tempId,agent,dst,accountId,accountNo,variables)
    
    return response  


async def fetchWhatsappTemplateList(accountId:str,accountNo:str):

    response=await whatsapp_template_repo.fetchWhatsappTemplateList(accountId,accountNo)
    
    return response      




async def fetchLeadId(phoneNumber:str,agentExtension:str,database: str,accountId:str,accountNo:str):

    response=await whatsapp_template_repo.fetchLeadId(phoneNumber,agentExtension,database,accountId,accountNo)
    
    return response          


async def delete_whatsapp_template(templateName:str, database:str, accountId:str, accountNo:str):

    response=await whatsapp_template_repo.deleteTemplate(templateName, database, accountId, accountNo)
    
    return response


async def create_campaign(s3_URL:str,fileName:str,campaignName:str, campaignCategory:str, templateName:str, templateId:str, scheduleTime:str,duplicateRemovalStatus:str, accountId:str, accountNo:str, database:str, groupId: str = None):

    if groupId:
        from repos.whatsapp_group_repo import WhatsappGroupRepo
        import pandas as pd
        import io
        import boto3
        from datetime import datetime
        
        repo = WhatsappGroupRepo()
        contacts = repo.get_group_contacts(groupId)
        
        if not contacts:
            return {"error": "Group has no contacts"}
            
        df = pd.DataFrame(contacts)
        
        
        rename_map = {
            "countryCode": "country_code",
            "msisdn": "mobile_number"
        }

        
        if "attributes" in df.columns:
            pass

        df.rename(columns=rename_map, inplace=True)
        
        cols_to_keep = ["country_code", "mobile_number"]
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        
        s3 = boto3.client(
            "s3",
            region_name=settings.AWS_DEFAULT_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        S3_BUCKET = "connecthub3m"
        S3_FOLDER = "WhatsappMedia/"
        
        unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_group_{groupId}.csv"
        s3_key = f"{S3_FOLDER}{unique_name}"
        
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=csv_buffer.getvalue(),
            ContentType='text/csv'
        )
        
        s3_URL = f"https://{S3_BUCKET}.s3.{settings.AWS_DEFAULT_REGION}.amazonaws.com/{s3_key}"
        fileName = unique_name

    response=await whatsapp_template_repo.create_campaign(s3_URL,fileName,campaignName, campaignCategory, templateName, templateId, scheduleTime,duplicateRemovalStatus, accountId, accountNo,database)
    
    return response    

async def fetch_campaign_report(limit:int,offset:int,searchString:str,sortField:str,sortOrder:str,accountId:str,accountNo:str):

    response=await whatsapp_template_repo.fetch_campaign_report(limit,offset,searchString,sortField,sortOrder, accountId, accountNo)
    
    return response



async def execute_task(campId: int, accountId: str, accountNo: str):
    print(f"Executing execute_task for campaign {campId}")

    response=await whatsapp_template_repo.execute_task(campId, accountId, accountNo)
    return response      