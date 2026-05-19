import uuid
from typing import Union
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, Response, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import campaign_service
from models.dto import CampaignUpdateRequest, CampaignDeleteRequest, CampaignFetchRequest, CampaignFieldCheckRequest, CampaignCreateCallerIdRequest

router = APIRouter(
    prefix="/ivrBlast/campaign",
    tags=["Campaign"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def campaignCreate(backgroundtasks: BackgroundTasks, tokenRequest: Request, campaignname: str = Form(...), campaigndescription: str = Form(...), carrierid: int = Form(...), carriername: str = Form(...), flowid: int = Form(...), flowname: str = Form(...), importfile: Union[UploadFile, None] = File(None)):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Lead File Validation Start #
    if importfile and importfile.filename != '' :
        file_content = await importfile.read()
        file_extension = importfile.filename.split('.')[-1]
    else:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"No File Input"
            }
        )
    allowed_extensions = ['csv', 'xls', 'xlsx']
    if file_extension not in allowed_extensions:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"Invalid File Format"
            },
        )
    # Lead File Validation Stop #

    file_name = uuid.uuid4()
    file_path = f"/tmp/{file_name}.{file_extension}"
    with open(file_path, "wb") as file:
        file.write(file_content)

    # MySql Logging Start #
    campaignid = campaign_service.create(
        campaignname,
        campaigndescription,
        carrierid,
        carriername,
        flowid,
        flowname,
        data.encryption
    )
    # MySql Logging Stop #

    # Numbers File Upload Start #
    result = backgroundtasks.add_task(campaign_service.numbersCreate, file_path, file_extension, campaignid, campaignname, campaigndescription, data.encryption)
    if isinstance(result, JSONResponse):
        return result
    # Numbers File Upload Stop #

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": f"Campaign Created Successfully."
        }
    )

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignUpdate(request: CampaignUpdateRequest, tokenRequest: Request):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Logging Start #
    await campaign_service.update(
        request.campaignid,
        request.campaignname,
        request.campaigndescription,
        request.carrierid,
        request.carriername,
        request.flowid,
        request.flowname,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Campaign Updated Successfully.",
        }
    )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignDelete(request: CampaignDeleteRequest, tokenRequest: Request, response: Response):
    
    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Logging Start #
    await campaign_service.delete(
        request.campaignid,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Campaign And Numbers Deleted Successfully."
        }
    )

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignFetch(request: CampaignFetchRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = campaign_service.fetch(
        request.limit,
        request.offset,
        request.searchString,
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Campaign Fetched Successfully",
            "data": result
        }
    )

@router.get("/list/carrier", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignListCarier(tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = campaign_service.listCarrier(
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Carrier Fetched Successfully",
            "data": result
        }
    )

@router.get("/list/flow", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignListFlow(tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = campaign_service.listFlow(
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Flow Fetched Successfully",
            "data": result
        }
    )

@router.post("/check", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignCheck(request: CampaignFieldCheckRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = campaign_service.check(
        request.campaignname,
        data.encryption
    )
    # MySql Fetching Stop #

    if result["uniqueConstraint"] == "Yes":
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Unique Constraint Triggered",
                "data": result["data"]
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Successful"
            }
        )

@router.get("/list/callerid", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignListCallerId(tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = campaign_service.listCallerId(
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"CallerId Fetched Successfully",
            "data": result
        }
    )

@router.post("/create/callerid", status_code=status.HTTP_201_CREATED, response_model=dict)
async def createCallerId(request: CampaignCreateCallerIdRequest, tokenRequest: Request):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Logging Start #
    await campaign_service.createCallerId(
        request.campaignid,
        request.callerids,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": f"CallerId Created Successfully."
        }
    )