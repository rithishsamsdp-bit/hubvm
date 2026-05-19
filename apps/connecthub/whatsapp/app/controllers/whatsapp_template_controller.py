from fastapi import APIRouter, HTTPException, Request, status,UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from config import settings
from services import whatsapp_template_service
from datetime import datetime
from typing import Any
from models.dto import FetchTemplateReportRequest, FetchCampaignReportRequest
import traceback
import json
import urllib.parse
import boto3
import botocore
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/whatsapp",
    tags=["WhatsappTemplate"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# AWS S3 Configuration
S3_BUCKET = "connecthub3m"
S3_REGION = "ap-south-1"
S3_FOLDER = "WhatsappMedia/"

# Initialize S3 client — uses ~/.aws/credentials automatically
s3 = boto3.client(
    "s3",
    region_name=S3_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)


@router.post("/create_whatsapp_template", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_template(
    file: UploadFile | None = File(None),
    fileName: str = Form(...),
    tempName: str = Form(...),
    tempCategory: str = Form(...),
    selectLan: str = Form(...),
    headerType: str = Form(...),
    headerValue: str = Form(...),
    mediaType: str = Form(...),
    mediaExtType: str = Form(...),
    bodyContent: str = Form(...),
    footerContent: str = Form(...),
    btnType: str = Form(...),
    btnNameVm: str = Form(...),
    wUrl: str = Form(...),
    btnNameCpn: str = Form(...),
    phoneNum: str = Form(...),
    Phone_Code: str = Form(...),
    btn1: str = Form(...),
    btn2: str = Form(...),
    btn3: str = Form(...),
    btn4: str = Form(""),
    btn5: str = Form(""),
    tokenRequest: Request = None
):
    # """
    # Uploads media file to S3 inside WhatsappMedia/ folder,
    # and passes metadata to whatsapp_template_service.
    # """

    # ✅ 1. Token decode / validation
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    print(settings.AUTH_TOKEN_NAME)
    data = whatsapp_template_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    
    s3_URL = None

    # ✅ 2. Validate file
    if file and file.filename:
        try:
            file_extension = file.filename.split(".")[-1]
            unique_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{fileName or 'file'}.{file_extension}"
            s3_key = f"{S3_FOLDER}{unique_name}"

            file_content = await file.read()

            s3.put_object(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Body=file_content,
                ContentType=file.content_type
            )

            s3_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

        except botocore.exceptions.ClientError as e:
            raise HTTPException(status_code=500, detail=f"S3 Client Error: {e.response['Error']['Message']}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error uploading file: {e}")

    # ✅ 6. Call template service (your business logic)
    response = await whatsapp_template_service.create_whatsapp_template(
        tempName, tempCategory, selectLan, headerType, headerValue,
        mediaType, mediaExtType, bodyContent, footerContent, btnType,
        btnNameVm, wUrl, btnNameCpn, phoneNum, Phone_Code,
        btn1, btn2, btn3, btn4, btn5, s3_URL, "onedb", data.m_accountId, data.m_accountNo
    )

    # ✅ 7. Check for errors in response
    if response and isinstance(response, dict):
        # Check if response contains error
        if "error" in response:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": response.get("error", "Template creation failed"),
                    "s3_url": s3_URL,
                    "data": response
                }
            )
        
        # Check if the body contains an error (from WhatsApp API)
        if "body" in response:
            try:
                body_data = json.loads(response["body"]) if isinstance(response["body"], str) else response["body"]
                if "error" in body_data:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "status": "error",
                            "message": body_data.get("error", {}).get("error_user_msg", "Template creation failed"),
                            "s3_url": s3_URL,
                            "data": response
                        }
                    )
            except (json.JSONDecodeError, TypeError):
                pass

    # ✅ 8. Return success JSON response
    return {
        "status": "success",
        "message": "WhatsApp template created successfully",
        "s3_url": s3_URL,
        "data": response
    }



@router.post("/fetch_whatsapp_template", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(templateId: str = Form(...),tokenRequest: Request = None):
    try:
        token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await whatsapp_template_service.fetch_whatsapp_template(
            templateId, data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /fetch_whatsapp_template:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    
    
    

@router.post("/fetch_whatsapp_template_report", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(request_body: FetchTemplateReportRequest, request: Request):
    try:
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await whatsapp_template_service.fetch_whatsapp_template_report(
            request_body.limit,
            request_body.offset,
            request_body.searchString,
            request_body.sortField,
            request_body.sortOrder,
            data.m_accountId,
            data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /fetch_whatsapp_template_report:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/fetch_campaign_report", status_code=status.HTTP_201_CREATED, response_model=Any)
async def fetch_campaign_report(request_body: FetchCampaignReportRequest, request: Request):
    try:
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await whatsapp_template_service.fetch_campaign_report(
            request_body.limit,
            request_body.offset,
            request_body.searchString,
            request_body.sortField,
            request_body.sortOrder,
            data.m_accountId,
            data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /fetch_campaign_report:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    

@router.post("/send_outbound_messages", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(file: UploadFile | None = File(None),fileName: str = Form(...),mediaType: str = Form(...),message: str = Form(...),dst: str = Form(...),agent: str = Form(...),tokenRequest: Request = None):    
    try:
        token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data
        
        s3_URL = None

        # ✅ 2. Validate file
        if file and file.filename:
            try:
                file_extension = file.filename.split(".")[-1]
                unique_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{fileName or 'file'}.{file_extension}"
                s3_key = f"{S3_FOLDER}{unique_name}"

                file_content = await file.read()

                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=file_content,
                    ContentType=file.content_type
                )

                s3_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

            except botocore.exceptions.ClientError as e:
                raise HTTPException(status_code=500, detail=f"S3 Client Error: {e.response['Error']['Message']}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected error uploading file: {e}")
        

        response = await whatsapp_template_service.send_outbound_messages(
            s3_URL,mediaType,message,dst,agent,"onedb", data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /send_outbound_messages:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/send_outbound_messages/app", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(file: UploadFile | None = File(None),fileName: str = Form(...),mediaType: str = Form(...),message: str = Form(...),dst: str = Form(...),agent: str = Form(...), token: str = Depends(oauth2_scheme)):    
    try:
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data
        
        s3_URL = None

        # ✅ 2. Validate file
        if file and file.filename:
            try:
                file_extension = file.filename.split(".")[-1]
                unique_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{fileName or 'file'}.{file_extension}"
                s3_key = f"{S3_FOLDER}{unique_name}"

                file_content = await file.read()

                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=file_content,
                    ContentType=file.content_type
                )

                s3_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

            except botocore.exceptions.ClientError as e:
                raise HTTPException(status_code=500, detail=f"S3 Client Error: {e.response['Error']['Message']}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected error uploading file: {e}")
        

        response = await whatsapp_template_service.send_outbound_messages(
            s3_URL,mediaType,message,dst,agent,"onedb", data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /send_outbound_messages:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    

    
    
    
@router.post("/callbackApi", status_code=status.HTTP_201_CREATED, response_model=Any)
async def callbackApi(request: Request):
    try:
        
        raw_body = await request.body()
        print(f"Raw Body: {raw_body}")

        # Decode to string
        body_str = raw_body.decode("utf-8")

        # Parse JSON
        body = json.loads(body_str)

        # Optional: make deep copy (just like in Lambda)
        formatted_body = json.loads(json.dumps(body))
        print(f"Formatted Body: {formatted_body}")

        # Send to your service/repo
        response = await whatsapp_template_service.callbackApi(formatted_body)
        return response
    
    except Exception as e:
        print("❌ Exception occurred in /send_outbound_messages:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})



@router.post("/sendManualTemplate", status_code=status.HTTP_201_CREATED, response_model=Any)
async def sendManualTemplate(request: Request):     

    try:
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data   

        # Parse JSON body
        body = await request.json()
        tempName = body.get("tempName")
        tempId = body.get("tempId")
        dst = body.get("phoneNumber")
        agent = body.get("agentExtension")
        
        variables = body.get("variables", [])
        
        if not tempName or not tempId or not dst:
            return JSONResponse(status_code=400, content={"error": "tempName and phoneNumber are required"})

        response = await whatsapp_template_service.sendManualTemplate(tempName, tempId,agent, dst, data.m_accountId, data.m_accountNo, variables)
        return response    


    except Exception as e:
        print("❌ Exception occurred in /sendManualTemplate:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})    


@router.post("/sendManualTemplate/app", status_code=status.HTTP_201_CREATED, response_model=Any)
async def sendManualTemplate(request: Request, token: str = Depends(oauth2_scheme)):     

    try:

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data   

        # Parse JSON body
        body = await request.json()
        tempName = body.get("tempName")
        tempId = body.get("tempId")
        dst = body.get("phoneNumber")
        agent = body.get("agentExtension")
        
        variables = body.get("variables", [])
        
        if not tempName or not tempId or not dst:
            return JSONResponse(status_code=400, content={"error": "tempName and phoneNumber are required"})

        response = await whatsapp_template_service.sendManualTemplate(tempName, tempId,agent, dst, data.m_accountId, data.m_accountNo, variables)
        return response    


    except Exception as e:
        print("❌ Exception occurred in /sendManualTemplate/app:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})           


@router.post("/fetchWhatsappTemplateList", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(tokenRequest: Request = None):
    try:
        token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await whatsapp_template_service.fetchWhatsappTemplateList(
            data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /fetchWhatsappTemplateList:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})        


@router.post("/fetchWhatsappTemplateList/app", status_code=status.HTTP_201_CREATED, response_model=Any)
async def create_template(token: str = Depends(oauth2_scheme)):
    try:
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await whatsapp_template_service.fetchWhatsappTemplateList(
            data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /fetchWhatsappTemplateList/app:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/fetchLeadId", status_code=status.HTTP_201_CREATED, response_model=Any)
async def fetchLeadId(request: Request):     

    try:
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data   

        # Parse JSON body
        body = await request.json()
        phoneNumber = body.get("phoneNumber")
        agentExtension = body.get("agentExtension")
        
        if not phoneNumber or not agentExtension:
            return JSONResponse(status_code=400, content={"error": "phoneNumber and agentExtension are required"})

        response = await whatsapp_template_service.fetchLeadId(phoneNumber, agentExtension,"onedb", data.m_accountId, data.m_accountNo)
        return response  

    except Exception as e:
        print("❌ Exception occurred in /fetchLeadId:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})         


@router.delete("/delete_whatsapp_template", status_code=status.HTTP_200_OK, response_model=Any)
async def delete_template(request: Request):     
    try:
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data   

        # Parse JSON body
        body = await request.json()
        templateName = body.get("templateName")
        
        if not templateName:
            return JSONResponse(status_code=400, content={"error": "templateName is required"})

        response = await whatsapp_template_service.delete_whatsapp_template(
            templateName, "onedb", data.m_accountId, data.m_accountNo
        )
        
        # Check for errors in response
        if response and isinstance(response, dict):
            if "error" in response:
                return JSONResponse(
                    status_code=response.get("statusCode", 400),
                    content={
                        "status": "error",
                        "message": response.get("error", "Failed to delete template"),
                        "data": response
                    }
                )
        
        return {
            "status": "success",
            "message": f"Template deleted successfully",
            "data": response
        }

    except Exception as e:
        print("❌ Exception occurred in /delete_whatsapp_template:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})




@router.post("/create_campaign", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_campaign(
    file: UploadFile | None = File(None),
    fileName: str = Form(None),
    campaignName: str = Form(...),
    campaignCategory: str = Form(...),
    templateName: str = Form(...),
    templateId: str = Form(...),
    scheduleTime: str = Form(...),
    duplicateRemovalStatus: str = Form(...),
    groupId: str = Form(None),
    tokenRequest: Request = None
):        
    try:
        token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        print(f"DEBUG: create_campaign token={token}")
        data = whatsapp_template_service.decode(token)
        print(f"DEBUG: create_campaign data={data}")
        if isinstance(data, JSONResponse):
            return data

        s3_URL = None

        if not groupId and (not file or not file.filename):
             return JSONResponse(status_code=400, content={"error": "Either file or Group must be provided"})

        if not groupId and file and file.filename:
            try:
                file_extension = file.filename.split(".")[-1]
                unique_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{fileName or 'file'}.{file_extension}"
                s3_key = f"{S3_FOLDER}{unique_name}"

                file_content = await file.read()

                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=file_content,
                    ContentType=file.content_type
                )

                s3_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

            except botocore.exceptions.ClientError as e:
                raise HTTPException(status_code=500, detail=f"S3 Client Error: {e.response['Error']['Message']}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected error uploading file: {e}")       

        if not campaignName or not campaignCategory or not templateName or not templateId or not scheduleTime:
            return JSONResponse(status_code=400, content={"error": "campaignName, campaignCategory, templateName, templateId, and scheduleTime are required"})

        response = await whatsapp_template_service.create_campaign(
            s3_URL,fileName,campaignName, campaignCategory, templateName, templateId, scheduleTime,duplicateRemovalStatus, data.m_accountId, data.m_accountNo,"onedb", groupId
        )
        return response
    except Exception as e:
        print("❌ Exception occurred in /create_campaign:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})