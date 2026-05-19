from fastapi import APIRouter,  Request, Response, status, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from models.dto import CLINumberCreateRequest, CLINumberUpdateRequest, CLINumberDeleteRequest, CLINumberFetchRequest, CLINumberMapRequest, CLINumberGetRequest, CLINumberExternalFetchRequest, CLINumberMapCallflowRequest 
from models.dto import CLINumberGetResponse, AccountListResponse, PeerListResponse, CallFlowListResponse, MemberListResponse, CLINumberMapCallflowResponse
from services import clinumber_service
from utils.RoleChecker import RoleChecker
from urllib.parse import parse_qs
from io import BytesIO
import pandas as pd
from types import SimpleNamespace
import asyncio
from fastapi import BackgroundTasks

router = APIRouter(
    prefix="/telephony/clinumber",
    tags=["CLINumber"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: CLINumberCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        cli = {
            "accountid": request.accountid,
            "accountno": request.accountno,
            "accountprefix": request.accountprefix,
            "clinumbername": request.clinumbername,
            "clinumbertype": request.clinumbertype,
            "clinumbercountrycode": request.clinumbercountrycode,
            "clinumbercountryname": request.clinumbercountryname,
            "prefixsubstringcount": 12,
            "clinumberstatus": request.clinumberstatus,
            "peerid": request.peerid
        }
        response = await clinumber_service.create(data.accountEncryption, cli, request.peerid)
        return response
        # return JSONResponse(
        #     status_code=status.HTTP_200_OK,
        #     content={"message": "CLI Number Created Successfully"}
        # )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def update(request: CLINumberUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await clinumber_service.update(
            request.accountid,
            request.accountno,
            request.accountprefix,
            request.clinumberid,
            request.clinumbername,
            request.clinumbertype,
            request.clinumbercountrycode,
            request.clinumbercountryname,
            request.clinumberstatus,
            12,
            request.peerid,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "CLI Number Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def delete(request: CLINumberDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await clinumber_service.delete(
            request.clinumberid,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "CLI Number Deleted Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(request: CLINumberFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.fetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberRole
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"CLI Numbers Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/map", status_code=status.HTTP_200_OK, response_model=dict)
async def map(request: CLINumberMapRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await clinumber_service.map(
            request.clinumbername,
            request.clinumberid,
            request.clinumbermapname,
            request.callflowid,
            request.callflowname,
            request.memberids,
            request.smsmembers,
            request.apiIntegration,
            request.apis,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "CLI Number Mapped Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/get/clinumber", status_code=status.HTTP_200_OK, response_model=CLINumberGetResponse)
async def listCLINumber(request: CLINumberGetRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.getCLINumber(
            request.clinumberid,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return {
            "message": f"CLI Number Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.get("/list/accounts", status_code=status.HTTP_200_OK, response_model=AccountListResponse)
async def listAccounts(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.listAccounts(
            data.accountEncryption
        )
        return  {
            "message": f"Accounts Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.get("/list/peers", status_code=status.HTTP_200_OK, response_model=PeerListResponse)
async def listPeers(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.listPeers(
            data.accountEncryption
        )
        return {
            "message": f"Peers Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.get("/list/callflows", status_code=status.HTTP_200_OK, response_model=CallFlowListResponse)
async def listCallFlows(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.listCallFlows(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return {
            "message": f"Call Flows Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.get("/list/members", status_code=status.HTTP_200_OK, response_model=MemberListResponse)
async def listMembers(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.listMembers(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return {
            "message": f"Members Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)
    
@router.post("/bulkcreate", status_code=status.HTTP_201_CREATED, response_model=dict)
async def memberCreateCSV(file: UploadFile = File(...),peerid = Form(...),tokenRequest: Request = None,response: Response = None,background_tasks: BackgroundTasks = None,_: bool = Depends(RoleChecker(["SUPERADMIN"]))):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        cliNumbers = []
        errors = []
        seen_numbers = set()
        MANDATORY_FIELDS = ["COUNTRYCODE", "COUNTRYNAME", "NUMBER", "TYPE"]
        VALID_NUMBER_TYPE_MODES = {"Tollfree", "Prepaid", "Unlimited"}
        
        if not peerid.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Peerid cannot be null or empty")
        
        # Validate file type
        if file.content_type != "text/csv":
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        content = await file.read()
        df = pd.read_csv(BytesIO(content))
        
        # get accounts
        accounts =  await clinumber_service.getAccounts(data.accountEncryption)
        
        # Validate required columns
        for i, row in df.iterrows():
            row_num = i + 2
            number = str(row.get("NUMBER", "")).strip()
            
            # Ensure mandatory fields exist
            if not all(str(row.get(field, "")).strip() for field in MANDATORY_FIELDS):
                errors.append({"row": row_num, "error": "Missing mandatory fields"})
                continue
            
            # Validation of duplicate numbers in the same file
            if number in seen_numbers:
                errors.append({"row": row_num, "error": f"Duplicate NUMBER '{number}'"})
                continue
            seen_numbers.add(number)
                
            # geting accountid, accountno, accountprefix from accountcode
            accountCode = str(row.get("ACCOUNTCODE", ""))
            TYPE = str(row.get("TYPE", ""))
            accountdetails = accounts.get(accountCode) if accountCode else None
            
            # Validating the number type
            
            if TYPE not in VALID_NUMBER_TYPE_MODES:
                errors.append({
                    "row": row_num,
                    "error": f"Invalid CLINUMBERTYPE '{TYPE}'. Must be one of {list(VALID_NUMBER_TYPE_MODES)}"
                })
                continue

            try:
                cli = {
                    "accountid": accountdetails.a_accountId if accountdetails else None,
                    "accountno": accountdetails.a_accountNo if accountdetails else None,
                    "accountprefix": accountdetails.a_accountPrefix if accountdetails else None,
                    "clinumbername": number,
                    "clinumbertype": str(row.get("TYPE", "")).strip(),
                    "clinumbercountrycode": int(row.get("COUNTRYCODE", 0)),
                    "clinumbercountryname": str(row.get("COUNTRYNAME", "")).strip(),
                    "prefixsubstringcount": 12,
                    "clinumberstatus": "Active",
                    "peerid": peerid
                }
                cliNumbers.append(cli)
            except Exception as e:
                errors.append({"row": row_num, "error": str(e)})
            
        if cliNumbers:
             asyncio.create_task(clinumber_service.upload(data.accountEncryption, cliNumbers, peerid))

        response_content = {"message": "CLI Numbers processing started"}
        if errors:
            response_content["errors"] = errors
        return JSONResponse(status_code=status.HTTP_201_CREATED, content=response_content)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)
    

@router.get("/list/phonenumbers", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await clinumber_service.listPhoneNumbers(data.accountEncryption, data.m_accountNo, data.m_memberRole)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"CLI Numbers Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)


# Customer Using this API
# 1) Sarvam

@router.post("/phonenumbers")
async def getPhoneNumbers(request: CLINumberExternalFetchRequest, tokenRequest: Request, response: Response):
    auth_header = tokenRequest.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
        
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format"
        )
        
    token = auth_header.split(" ")[1]

    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await clinumber_service.getPhoneNumbers(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberRole
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"CLI Numbers Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)
    
@router.get("/channelcount")
async def channelcount(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format"
        )

    token = auth_header.split(" ")[1]

    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await clinumber_service.channelcount(
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberRole
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Channel Utilization",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/map/callflow/integration", status_code=status.HTTP_200_OK, response_model=CLINumberMapCallflowResponse)
async def mapCallflow(request: CLINumberMapCallflowRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = clinumber_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await clinumber_service.mapCallflow(request, data.m_accountId, data.m_accountNo, "onedb")
        return {
            "message": f"CallFlow Mapped Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/directory")
async def map(request: Request):
    raw_body = await request.body()
    form_data = {k: v[0] for k, v in parse_qs(raw_body.decode("utf-8")).items()}

    action = form_data.get("action")
    extension = form_data.get("user")
    domain = form_data.get("domain")

    if action == "sip_auth":
        try:
            records = await clinumber_service.getPassword(extension, "onedb")
            if not records:
                error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                <document type="freeswitch/xml">
                    <section name="directory">
                        <result status="not found"/>
                    </section>
                </document>"""
                return Response(content=error_xml, media_type="application/xml")
            password = records[0]["m_memberPassword"]
            extension = records[0]["m_memberExtensionNo"]
            
            xml_content = await clinumber_service.Register(domain, extension, password, "onedb")
            return Response(content=xml_content, media_type="application/xml")
        except Exception as e:
            error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <document type="freeswitch/xml">
                <section name="directory">
                    <result status="error"/>
                </section>
            </document>"""
            return Response(content=error_xml, media_type="application/xml")