from fastapi import APIRouter,  Request, Response, status, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from models.dto import CallFlowCreateRequest, CallFlowUpdateRequest, CallFlowDeleteRequest, CallFlowFetchRequest, CallFlowPreviewRequest, UploadFileDeleteRequest, UploadFilePreviewRequest, CallFlowGetRequest, QueueGroupListResponse
from services import callflow_service
import asyncio

router = APIRouter(
    prefix="/telephony/callflow",
    tags=["CallFlow"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: CallFlowCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        callflowdata = await callflow_service.modifywithFilePath(request.callflowname, request.callflowdata, data.m_accountId, data.m_accountNo, data.p_proxyDirectoryName)
        await callflow_service.create(
            request.callflowname,
            callflowdata,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        asyncio.create_task(callflow_service.createVoiceResponse(callflowdata))
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Call Flow Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def update(request: CallFlowUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        callflowdata = await callflow_service.modifywithFilePath(request.callflowname, request.callflowdata, data.m_accountId, data.m_accountNo, data.p_proxyDirectoryName)
        await callflow_service.update(
            request.callflowid,
            request.callflowname,
            callflowdata,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        asyncio.create_task(callflow_service.deleteVoiceResponse(request.callflowname, data.m_accountId, data.p_proxyDirectoryName))
        asyncio.create_task(callflow_service.createVoiceResponse(callflowdata))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Call Flow Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def delete(request: CallFlowDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await callflow_service.delete(
            request.callflowid,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        asyncio.create_task(callflow_service.deleteVoiceResponse(request.callflowname, data.m_accountId, data.p_proxyDirectoryName))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Call Flow Deleted Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(request: CallFlowFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.fetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Call Flow Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/preview/voiceresponse", status_code=status.HTTP_200_OK, response_model=dict)
async def previewVoiceResponse(request: CallFlowPreviewRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.previewVoiceResponse(
            request.content,
            request.voiceid,
            request.language,
            request.engine
        )
        return StreamingResponse(
            result,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="preview.mp3"'
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/uploadfile/create", status_code=status.HTTP_200_OK, response_model=dict)
async def uploadfileCreate(callflowname: str = Form(...), uploadfile: UploadFile = File(...), tokenRequest: Request = None, response: Response = None):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.uploadfileCreate(
            callflowname,
            uploadfile,
            data.p_proxyDirectoryName,
            data.m_accountId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Upload File Created Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/uploadfile/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def uploadfileDelete(request: UploadFileDeleteRequest, tokenRequest: Request = None, response: Response = None):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await callflow_service.uploadfileDelete(request)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Upload File Deleted Successfully"
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/uploadfile/preview", status_code=status.HTTP_200_OK, response_model=dict)
async def uploadfilePreview(request: UploadFilePreviewRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.uploadfilePreview(request)
        return StreamingResponse(
            result,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="preview.mp3"'
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/get/callflow", status_code=status.HTTP_200_OK, response_model=dict)
async def listCallFlows(request: CallFlowGetRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.getCallFlow(
            request.callflowid,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Call Flow Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/list/queuegroups", status_code=status.HTTP_200_OK, response_model=QueueGroupListResponse)
async def listQueueGroups(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = callflow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await callflow_service.listQueueGroups(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return {
            "message": f"Queue Groups Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})