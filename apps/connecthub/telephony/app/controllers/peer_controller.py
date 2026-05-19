from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from services import peer_service
from models.dto import PeerCreateRequest, PeerDeleteRequest, PeerFetchRequest, WhatsappPeerCreateRequest, WhatsappPeerDeleteRequest, WhatsappPeerFetchRequest, ServerReachabilityRequest
# from models.dto import PeerUpdateRequest, PeervalidationModel
from models.dto import PeerCreateResponse, PeerDeleteResponse, PeerFetchResponse, WhatsappPeerCreateResponse, WhatsappPeerDeleteResponse, WhatsappPeerFetchResponse, ServerReachabilityResponse
from utils.RoleChecker import RoleChecker
from typing import Annotated

router = APIRouter(
    prefix="/telephony/peer",
    tags=["peer"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=PeerCreateResponse)
async def create(request: PeerCreateRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await peer_service.create(request, 'onedb')
        return {
            "message": f"Peer Created Successfully",
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

# @router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
# async def update(request: PeerUpdateRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))],):
#     token = tokenRequest.cookies.get("accessToken")
#     data = peer_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     try:
#         response = await peer_service.update(
#             data.m_accountId,
#             data.m_accountNo,
#             data.accountEncryption,
#             data.m_memberExtensionNo,
#             request.p_peerId,
#             request.p_peerName,
#             request.p_peerSecret,
#             request.p_peerHost,
#             request.p_peerPrefix,
#             request.p_peerPort,
#             request.p_peerType,
#             request.p_peerStatus,
#             request.p_peerPilotno,
#             request.p_peerOutboundPrefix,
#             request.p_peerInboundPrefix
#         )
#         return response
#     except HTTPException as e:
#         return JSONResponse(
#             status_code=e.status_code, 
#             content={"message": str(e.detail)}
#         )
#     except Exception as e:
#         return JSONResponse(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             content={"message": "Internal Server Error: " + str(e)}
#         )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=PeerDeleteResponse)
async def delete(request: PeerDeleteRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await peer_service.delete(request, 'onedb')
        return {
            "message": f"Peer Deleted Successfully",
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=PeerFetchResponse)
async def fetch(request: PeerFetchRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await peer_service.fetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            'onedb'
        )
        return {
            "message": "Peers Fetched Successfully",
            "data": {
                "totalRecordsCount": result["totalRecordsCount"],
                "totalRecords": result["totalRecords"]
            }
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
# @router.post("/dropdown", status_code=status.HTTP_200_OK, response_model=dict)
# async def dropdown( tokenRequest: Request) -> dict:

#     token = tokenRequest.cookies.get("accessToken")
#     data = peer_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     try:
#         result =  await peer_service.dropdown(
#             data.m_accountId,
#             data.m_accountNo,
#             data.accountEncryption,
#             data.m_memberExtensionNo
#         )
#         return result
#     except HTTPException as e:
#         return JSONResponse(
#             status_code=e.status_code, 
#             content={"message": str(e.detail)}
#         )
#     except Exception as e:
#         return JSONResponse(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             content={"message": "Internal Server Error: " + str(e)}
#         )

# @router.post("/validation", status_code=status.HTTP_201_CREATED, response_model=dict)
# async def validation(request: PeervalidationModel, tokenRequest: Request, response: Response):
#     print("Received request to validate contact:", request)
#     token = tokenRequest.cookies.get("accessToken")
#     data = peer_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     try:
#         print(request.vtype)
#         result  = await peer_service.validator(
#             request.vtype,
#             request.vvalue,
#             request.p_peerId,
#             data.m_memberExtensionNo,
#             data.accountEncryption, 
#             data.m_accountId,
#             data.m_accountNo
#         )
#         return result 
#     except HTTPException as e:
#         return JSONResponse(
#             status_code=e.status_code, 
#             content={"message": str(e.detail)}
#         )
#     except Exception as e:
#         return JSONResponse(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             content={"message": "Internal Server Error: " + str(e)}
#         )

@router.post("/whatsapp/create", status_code=status.HTTP_201_CREATED, response_model=WhatsappPeerCreateResponse)
async def WhatsappPeerCreate(request: WhatsappPeerCreateRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await peer_service.WhatsappPeerCreate(request, 'onedb')
        return {
            "message": f"Whatsapp Peer Created Successfully",
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/whatsapp/delete", status_code=status.HTTP_200_OK, response_model=WhatsappPeerDeleteResponse)
async def WhatsappPeerDelete(request: WhatsappPeerDeleteRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await peer_service.WhatsappPeerDelete(request, 'onedb')
        return {
            "message": f"Whatsapp Peer Deleted Successfully",
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/whatsapp/fetch", status_code=status.HTTP_200_OK, response_model=WhatsappPeerFetchResponse)
async def WhatsappPeerFetch(request: WhatsappPeerFetchRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await peer_service.WhatsappPeerFetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            'onedb'
        )
        return {
            "message": "Whatsapp Peers Fetched Successfully",
            "data": {
                "totalRecordsCount": result["totalRecordsCount"],
                "totalRecords": result["totalRecords"]
            }
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/server/reachability", status_code=status.HTTP_200_OK, response_model=ServerReachabilityResponse)
async def reachabilityTest(request: ServerReachabilityRequest, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))]):
    token = tokenRequest.cookies.get("accessToken")
    data = peer_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await peer_service.reachabilityTest(request.peerhost)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})