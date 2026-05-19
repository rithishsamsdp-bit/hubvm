from fastapi import APIRouter, Request, Response, status, HTTPException, Query, Depends
import json
from fastapi.responses import JSONResponse
from fastapi.responses import ORJSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import report_service
from models.dto import CdrReportFetchRequest, ProductionReportFetchRequest, LoginReportFetchRequest, VoiceReportFetchRequest, BreakReportFetchRequest, QueueMissedFetchRequest, MissedCallsFetchRequest, MailAutomationCreateRequest, MailAutomationFetchRequest, MailAutomationUpdateRequest, CdrReportFetchRequestWebhook, SmsDLRReportFetchRequest

router = APIRouter(
    prefix="/report",
    tags=["Report"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/cdr/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def cdrReportFetch(request: CdrReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.fetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            request.campaignid,
            request.calldisposition,
            request.calldirection,
            request.callmode,
            request.calldatestart,
            request.calldateend,
            request.type,
            request.dialmethod,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId,
            data.m_memberRole,
            data.a_accountTimeZone,
            'onedb'
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/global/cdr/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def globalCdrReportFetch(request: CdrReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.globalfetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            request.campaignid,
            request.calldisposition,
            request.calldirection,
            request.callmode,
            request.calldatestart,
            request.calldateend,
            request.type,
            request.dialmethod,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId,
            data.m_memberRole,
            data.a_accountTimeZone,
            'onedb'
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/predictive/cdr/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def predictiveCdrReportFetch(request: CdrReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.fetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            request.campaignid,
            request.calldisposition,
            request.calldirection,
            request.callmode,
            request.calldatestart,
            request.calldateend,
            request.type,
            "predictive",
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId,
            data.m_memberRole,
            data.a_accountTimeZone,
            'onedb'
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/predictive/cdr/fetch/export")
async def predictiveCdrReportExport(
    tokenRequest: Request,
    limit: int = 50,
    offset: int = 0,
    sortField: str = "c_callDateTime",
    sortOrder: str = "DESC",
    searchString: str = None,
    campaignid: int = None,
    calldisposition: str = None,
    calldirection: str = None,
    callmode: str = None,
    calldatestart: str = None,
    calldateend: str = None
):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
        
    try:
        result = await report_service.fetch(
            limit,
            offset,
            sortOrder,
            sortField,
            searchString,
            campaignid,
            calldisposition,
            calldirection,
            callmode,
            calldatestart,
            calldateend,
            "export",
            "predictive",
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId,
            data.m_memberRole,
            data.a_accountTimeZone,
            'onedb'
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/cdr/fetch/agent", status_code=status.HTTP_201_CREATED, response_model=dict)
async def cdrReportFetch(request: CdrReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.fetchAgent(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            request.campaignid,
            request.calldisposition,
            request.calldirection,
            request.callmode,
            request.calldatestart,
            request.calldateend,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberExtensionNo,
            data.a_accountTimeZone,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Cdr Records Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/list/campaign", status_code=status.HTTP_200_OK, response_model=dict)
async def listCampaign(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.listCampaign(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Campaign Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/productionreport/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def productionreport(request: ProductionReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.productionreport(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Full Process Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/login/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def loginreport(request: LoginReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.loginreport(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Login Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})    

@router.post("/voicemail/agent/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def voiceReportFetch(request: VoiceReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.voiceReportFetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.search,
            request.calldatestart,
            request.calldateend,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberExtensionNo
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Cdr Records Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/break/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def Break(request: BreakReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.Break(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Break Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/conference/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def conference(request: BreakReportFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.conference(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Conference Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/queuemissed/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def queuemissed(request: QueueMissedFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.queuemissed(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Queue Missed Call Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

################################################## Sarvam Report API #############################################################
@router.post("/cdr/get", response_class=ORJSONResponse)
# @router.post("/cdr/get")
async def reportwebhook(request: CdrReportFetchRequestWebhook, token: str = Depends(oauth2_scheme)):
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.reportwebhook(request.unique_call_identifier, data.m_accountId, data.m_accountNo, data.m_memberId, 'onedb')
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
#################################################### Sarvam API END ##############################################################
################################################### Export APIs ################################################################## 
@router.get("/cdr/fetch/export", status_code=status.HTTP_201_CREATED, response_model=dict)
async def cdrReportFetchexport( tokenRequest: Request, response: Response, limit: int = Query(10), offset: int = Query(0), sortOrder: str = Query("desc"), sortField: str = Query("calldate"), searchString: str = Query(None), campaignid: str = Query(None), calldisposition: str = Query(None), calldirection: str = Query(None), callmode: str = Query(None), dialmethod: str = Query(None), calldatestart: str = Query(None), calldateend: str = Query(None), type: str = Query(None)):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.fetch(limit,offset,sortOrder,sortField,searchString,campaignid,calldisposition,calldirection,callmode,calldatestart,calldateend,type,dialmethod,data.m_accountId,data.m_accountNo,data.m_memberId,data.m_memberRole,data.a_accountTimeZone,'onedb')
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/global/cdr/fetch/export", status_code=status.HTTP_201_CREATED, response_model=dict)
async def globalCdrReportFetchExport( tokenRequest: Request, response: Response, limit: int = Query(10), offset: int = Query(0), sortOrder: str = Query("desc"), sortField: str = Query("calldate"), searchString: str = Query(None), campaignid: str = Query(None), calldisposition: str = Query(None), calldirection: str = Query(None), callmode: str = Query(None), dialmethod: str = Query(None), calldatestart: str = Query(None), calldateend: str = Query(None), type: str = Query(None)):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.globalfetch(limit,offset,sortOrder,sortField,searchString,campaignid,calldisposition,calldirection,callmode,calldatestart,calldateend,type,dialmethod,data.m_accountId,data.m_accountNo,data.m_memberId,data.m_memberRole,data.a_accountTimeZone,'onedb')
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.get("/productionreport/fetch/export", status_code=status.HTTP_200_OK, response_model=dict)
async def productionreportexport( tokenRequest: Request, response: Response, limit: int = Query(10, description="Number of records to fetch"), offset: int = Query(0, description="Offset for pagination"), calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"), calldateend: str = Query(..., description="End date in YYYY-MM-DD format"), search: str = Query(None, description="Search by member name"), type: str = Query(None, description="Set to 'export' to export CSV")):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await report_service.productionreport(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,data.m_memberId)

        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.get("/login/fetch/export", status_code=status.HTTP_200_OK, response_model=dict)
async def loginreportexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.loginreport(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
    
@router.get("/break/fetch/export", status_code=status.HTTP_200_OK, response_model=dict)
async def breakreportexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.Break(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    

@router.get("/conference/fetch/export", status_code=status.HTTP_200_OK, response_model=dict)
async def conferencereportexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.conference(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/queuemissed/fetch/export", status_code=status.HTTP_200_OK, response_model=dict)
async def queuemissedexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.queuemissed(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})




@router.post("/missedcalls/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def missedcalls(request: MissedCallsFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.missedcalls(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            'onedb',
            data.m_memberRole,
            data.m_memberId,
            data.a_accountTimeZone,
            data.m_memberExtensionNo
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Missed Calls Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/missedcalls/fetch/export", status_code=status.HTTP_200_OK)
async def missedcallsexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.missedcalls(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,'onedb',data.m_memberRole,data.m_memberId,data.a_accountTimeZone,data.m_memberExtensionNo)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/missedcalls/admin/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def adminmissedcalls(request: MissedCallsFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.missedcalls(
            request.limit,
            request.offset,
            request.calldatestart,
            request.calldateend,
            request.search,
            request.type,
            data.m_accountId,
            data.m_accountNo,
            'onedb',
            data.m_memberRole,
            data.m_memberId,
            data.a_accountTimeZone
            # No extension filter for admin
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Missed Calls Report Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/missedcalls/admin/fetch/export", status_code=status.HTTP_200_OK)
async def adminmissedcallsexport(tokenRequest: Request,response: Response,limit: int = Query(10, description="Number of records to fetch"),offset: int = Query(0, description="Offset for pagination"),calldatestart: str = Query(..., description="Start date in YYYY-MM-DD format"),calldateend: str = Query(..., description="End date in YYYY-MM-DD format"),search: str = Query(None, description="Search string"),type: str = Query(None, description="Type filter")):
    # Get token from cookie
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await report_service.missedcalls(limit,offset,calldatestart,calldateend,search,type,data.m_accountId,data.m_accountNo,'onedb',data.m_memberRole,data.m_memberId,data.a_accountTimeZone)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.post("/mail/automation/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def createMailAutomation(request: MailAutomationCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.createAutomation(
            data.m_accountId,
            data.m_accountNo,
            request.name,
            request.reportName,
            request.schedule,
            request.time,
            request.day,
            request.dataRange,
            request.toEmail,
            request.ccEmail,
            request.extensionFilter,
            request.timezoneFilter,
            request.fieldsFilter,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/mail/automation/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetchMailAutomation(request: MailAutomationFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.fetchAutomation(
            data.m_accountId,
            data.m_accountNo,
            request.limit,
            request.offset,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Mail Automations Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.delete("/mail/automation/delete/{id}", status_code=status.HTTP_200_OK, response_model=dict)
async def deleteMailAutomation(id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.deleteAutomation(
            data.m_accountId,
            data.m_accountNo,
            id,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.put("/mail/automation/update/{id}", status_code=status.HTTP_200_OK, response_model=dict)
async def updateMailAutomation(id: int, request: MailAutomationUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.updateAutomation(
            data.m_accountId,
            data.m_accountNo,
            id,
            request.name,
            request.reportName,
            request.schedule,
            request.time,
            request.day,
            request.dataRange,
            request.toEmail,
            request.ccEmail,
            request.extensionFilter,
            request.timezoneFilter,
            request.fieldsFilter,
            request.status,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.patch("/mail/automation/toggle-status/{id}", status_code=status.HTTP_200_OK, response_model=dict)
async def toggleMailAutomationStatus(id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.toggleAutomationStatus(
            data.m_accountId,
            data.m_accountNo,
            id,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

# PUBLIC DOWNLOAD ENDPOINT (UNSECURED as per user request)
@router.get("/mail/download", status_code=status.HTTP_200_OK)
async def public_download(
    response: Response,
    accountid: int = Query(...), 
    accountno: str = Query(...), 
    calldatestart: str = Query(...), 
    calldateend: str = Query(...),
    reportName: str = Query(...),
    extensionFilter: str = Query(None),
    timezoneFilter: str = Query(None),
    fieldsFilter: str = Query(None)
):
    try:
        if reportName == "CDR Report":
            result = await report_service.mail_cdr_fetch(
                limit=100000, 
                offset=0, 
                sortorder='desc', 
                sortfield='c_callId', 
                searchstring=None, 
                campaignid=0, 
                calldisposition=None, 
                calldirection=None, 
                callmode=None, 
                calldatestartrange=calldatestart, 
                calldateendrange=calldateend, 
                type='export', 
                accountid=accountid, 
                accountno=accountno, 
                memberId=0, 
                memberrole='ADMIN', 
                database='onedb',
                include_followups=False,
                extensionFilter=json.loads(extensionFilter) if extensionFilter else None,
                timezoneFilter=timezoneFilter,
                fieldsFilter=json.loads(fieldsFilter) if fieldsFilter else None
            )
            return result
        else:
             return JSONResponse(status_code=400, content={"message": "Unknown Report Type"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

@router.post("/sms_dlr_report")
async def sms_dlr_report(request: SmsDLRReportFetchRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await report_service.sms_dlr_report(
            request.limit,
            request.offset,
            request.search,
            request.fromDate,
            request.toDate,
            request.sortField,
            request.sortOrder,
            request.status,
            request.direction,
            data.m_accountId,
            data.m_accountNo,
            request.export
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
