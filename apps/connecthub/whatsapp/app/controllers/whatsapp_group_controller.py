from fastapi import APIRouter, UploadFile, File, Form, Request, status, Depends
from fastapi.responses import JSONResponse
from services.whatsapp_group_service import WhatsappGroupService
from services import whatsapp_template_service # For token decoding
from config import settings
import traceback

router = APIRouter(
    prefix="/whatsapp/group",
    tags=["WhatsappGroup"]
)

group_service = WhatsappGroupService()

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_group(
    file: UploadFile = File(...),
    groupName: str = Form(...),
    request: Request = None
):
    try:
        # Auth
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
             return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
        
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        # Read File
        file_content = await file.read()
        
        response = await group_service.create_group(
            file_content, 
            file.filename, 
            groupName, 
            data.m_accountId
        )
        
        if "error" in response:
             return JSONResponse(status_code=400, content=response)
             
        return response

    except Exception as e:
        print(f"❌ Error in create_group: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/list", status_code=status.HTTP_200_OK)
async def list_groups(
    limit: int = 100,
    offset: int = 0,
    search: str = "",
    request: Request = None
):
    try:
        # Auth
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
             return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
        
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        response = await group_service.get_groups(
            data.m_accountId, 
            limit, 
            offset, 
            search
        )
        
        return response

    except Exception as e:
        print(f"❌ Error in list_groups: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/contacts", status_code=status.HTTP_200_OK)
async def get_group_contacts(
    groupId: str,
    request: Request = None
):
    try:
        # Auth
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
             return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
        
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        contacts = await group_service.get_group_contacts(groupId)
        
        return {"contacts": contacts, "count": len(contacts)}

    except Exception as e:
        print(f"❌ Error in get_group_contacts: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.delete("/delete", status_code=status.HTTP_200_OK)
async def delete_group(
    groupId: str,
    request: Request = None
):
    try:
        # Auth
        token = request.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
             return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
        
        data = whatsapp_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data

        success = await group_service.delete_group(groupId, data.m_accountId)
        
        if success:
            return {"message": "Group deleted successfully"}
        else:
            return JSONResponse(status_code=400, content={"error": "Failed to delete group"})

    except Exception as e:
        print(f"❌ Error in delete_group: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
