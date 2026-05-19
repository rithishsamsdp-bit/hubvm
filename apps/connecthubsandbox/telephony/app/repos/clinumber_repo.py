from sqlalchemy import Delete, Update, select, func, or_, and_, String, delete, update as sql_update
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from db.context import get_async_engine, get_redis
from models.db import CLINumbers, Accounts, Peers, CallFlows, Members, RelationalCLINumbersMembers, API, SmsFlow, ExternalIntegrationAPIs, RelationalExternalIntegrationAPIsCLINumbersCallFlows
from models.dto import CLINumbersModel, AccountsModel, PeersModel, CallFlowsModel, MembersModel, CLINumberGetResponse,CLINumbersExternalModel, SMSMember
from services import clinumber_service
from typing import List, Dict, Any, Optional
import traceback, asyncio
import redis
import json

async def create(database: str, cliNumbers: list, peerid: int):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        numbers = [cli["clinumbername"] for cli in cliNumbers]
        existing = await session.execute(select(CLINumbers.c_clinumberName).where(CLINumbers.c_clinumberName.in_(numbers)))
        existingNumbers = set(row[0] for row in existing.fetchall())
        accounts = await getIdBasedAccounts(database)

        errors = []
        successes = []
        newObjects = []

        recordQuery = (
            select(Peers.p_peerName, Peers.p_peerHost, Peers.p_peerPilotno, Peers.p_peerOutboundPrefix, Peers.p_peerInboundPrefix)
            .where(Peers.p_peerId == peerid)
        )
        result = (await session.execute(recordQuery)).one_or_none()
        if result:
            peername, peerhost, peerpilotno, peeroutboundprefix, peerinboundprefix = result
        else:
            peername = peerhost = peerpilotno = peeroutboundprefix = peerinboundprefix = None

        for cli in cliNumbers:
            print("DEBUG cli:", cli)
            print("DEBUG cli.get('accountid') type:", type(cli.get("accountid")), "value:", cli.get("accountid"))

            # Check for existing CLI Number
            if cli["clinumbername"] in existingNumbers:
                errors.append({
                        "message": f"CLI Number {cli['clinumbername']} already exists"
                    })
                continue
            # CLI Number Validation
            if cli.get("accountid"):
                is_valid, error_msg = await checkPhonenumberLimit(cli, accounts, session)
                if not is_valid:
                    errors.append({
                        "error": error_msg
                    })
                    continue
                account = accounts.get(cli["accountid"])
                accountid = getattr(account, "a_accountId", None)
                accountno = getattr(account, "a_accountNo", None)
                accountname = getattr(account, "a_accountName", None)
                accountprefix = getattr(account, "a_accountPrefix", None)
                accountserviceregion = getattr(account, "a_accountServiceRegion", None)
                asyncio.create_task(clinumber_service.createCONF(peername, peerhost, peerpilotno, peeroutboundprefix, peerinboundprefix, cli["clinumbername"], cli["clinumbertype"], cli["clinumbercountrycode"], cli["clinumbercountryname"], cli["prefixsubstringcount"], accountid, accountno, accountname, accountprefix, accountserviceregion))


            # Create new CLI Number object
            obj = CLINumbers(
                c_accountId=cli["accountid"],
                c_accountNo=cli["accountno"],
                c_accountPrefix=cli["accountprefix"],
                c_clinumberName=cli["clinumbername"],
                c_clinumberType=cli["clinumbertype"],
                c_clinumberCountryCode=cli["clinumbercountrycode"],
                c_clinumberCountryName=cli["clinumbercountryname"],
                c_clinumberStatus=cli["clinumberstatus"],
                c_peerId=cli["peerid"],
            )
            newObjects.append(obj)
            successes.append({
                "message": f"{cli['clinumbername']} created successfully"
            })
        # Bulk insert new CLI Numbers
        if newObjects:
            session.add_all(newObjects)
            await session.commit()
        
        response_content = {
            "success": successes,
            "errors": errors
        }
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=response_content
        )
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def update(accountid: int, accountno: str, accountprefix: int, clinumberid: int, clinumbername: str, clinumbertype: str, clinumbercountrycode: str, clinumbercountryname: str, clinumberstatus: str, prefixsubstringcount: int, peerid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        if accountid is None:
            raise HTTPException(
                status_code=400,
                detail="Map an Account"
            )
        
        clinumber = (await session.execute(
            select(CLINumbers).where(CLINumbers.c_clinumberId == clinumberid)
        )).scalar_one_or_none()

        recordQuery = (
            select(Peers.p_peerName, Peers.p_peerHost, Peers.p_peerPilotno, Peers.p_peerOutboundPrefix, Peers.p_peerInboundPrefix)
            .where(Peers.p_peerId == peerid)
        )
        result = (await session.execute(recordQuery)).one_or_none()
        if result:
            peername, peerhost, peerpilotno, peeroutboundprefix, peerinboundprefix = result
        else:
            peername = peerhost = peerpilotno = peeroutboundprefix = peerinboundprefix = None

        if clinumber.c_accountId is not None:
            if clinumber.c_accountId == accountid:
                raise HTTPException(
                    status_code=400,
                    detail="Account Already Mapped"
                )
            elif clinumber.c_accountId != accountid:
                asyncio.create_task(clinumber_service.deleteCONF(peerhost, clinumbername))
                await session.execute(
                    Delete(RelationalCLINumbersMembers).where(
                        RelationalCLINumbersMembers.r_clinumberId == clinumberid
                    )
                )
        accounts = await getIdBasedAccounts(database)
        account = accounts.get(accountid)
        accountid = getattr(account, "a_accountId", None)
        accountno = getattr(account, "a_accountNo", None)
        accountname = getattr(account, "a_accountName", None)
        accountprefix = getattr(account, "a_accountPrefix", None)
        accountserviceregion = getattr(account, "a_accountServiceRegion", None)
        cli = {
                "accountid": accountid,
                "accountno": accountno,
                "accountprefix": accountprefix,
                "clinumbername": clinumbername,
                "clinumbertype": clinumbertype,
                "clinumbercountrycode": clinumbercountrycode,
                "clinumbercountryname": clinumbercountryname,
                "prefixsubstringcount": prefixsubstringcount,
                "clinumberstatus": clinumberstatus,
                "peerid": peerid
        }
        is_valid, error_msg = await checkPhonenumberLimit(cli, accounts, session)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        asyncio.create_task(clinumber_service.createCONF(peername, peerhost, peerpilotno, peeroutboundprefix, peerinboundprefix, clinumbername, clinumbertype, clinumbercountrycode, clinumbercountryname, prefixsubstringcount, accountid, accountno, accountname, accountprefix, accountserviceregion))
        await session.execute(Update(CLINumbers).where(
            CLINumbers.c_clinumberId == clinumberid,
        ).values({
            CLINumbers.c_accountId: accountid,
            CLINumbers.c_accountNo: accountno,
            CLINumbers.c_accountPrefix: accountprefix
        }))
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def delete(clinumberid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        stmt = (
            select(
                CLINumbers.c_clinumberName,
                Peers.p_peerHost
            )
            .join(Peers, Peers.p_peerId == CLINumbers.c_peerId)
            .where(CLINumbers.c_clinumberId == clinumberid)
        )
        result = (await session.execute(stmt)).one_or_none()
        if not result:
            raise HTTPException(status_code=404, detail="CLI Number not found")
        clinumbername, peerhost = result
        asyncio.create_task(clinumber_service.deleteCONF(peerhost, clinumbername))
        await session.execute(
            Delete(CLINumbers).where(
                CLINumbers.c_clinumberId == clinumberid
            )
        )
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str, accountid: int, accountno: str, memberrole:str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (select(
            CLINumbers.c_clinumberId,
            Accounts.a_accountId,
            Accounts.a_accountNo,
            Accounts.a_accountName,
            Accounts.a_accountPrefix,
            CLINumbers.c_clinumberName,
            CLINumbers.c_clinumberType,
            CLINumbers.c_clinumberCountryCode,
            CLINumbers.c_clinumberCountryName,
            CLINumbers.c_clinumberStatus,
            CLINumbers.c_clinumbermapName,
            CLINumbers.c_callflowId,
            CLINumbers.c_callflowName,
            CLINumbers.c_apiIntegration,
            Peers.p_peerId,
            Peers.p_peerName,
            SmsFlow.s_smsFlowJson
        ).join(Peers, Peers.p_peerId == CLINumbers.c_peerId)
        .outerjoin(Accounts, Accounts.a_accountId == CLINumbers.c_accountId)
        .outerjoin(SmsFlow, SmsFlow.s_smsclinumberId == CLINumbers.c_clinumberId)
        .outerjoin(RelationalCLINumbersMembers, RelationalCLINumbersMembers.r_clinumberId == CLINumbers.c_clinumberId)
        .outerjoin(Members, Members.m_memberId == RelationalCLINumbersMembers.r_memberId).group_by(CLINumbers.c_clinumberId)
    )
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    CLINumbers.c_clinumberName.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberType.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberCountryCode.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberCountryName.ilike(f"%{searchString}%"),
                    Peers.p_peerName.ilike(f"%{searchString}%"),
                    Accounts.a_accountName.ilike(f"%{searchString}%"),
                    Members.m_memberExtensionNo.cast(String).ilike(f"%{searchString}%"),
                    Members.m_memberName.ilike(f"%{searchString}%")
                )
            )
        if sortField and sortOrder:
            recordQuery = recordQuery.order_by(getattr(getattr(CLINumbers, sortField), sortOrder.lower())())
        if memberrole != "SUPERADMIN":
            recordQuery = recordQuery.where(CLINumbers.c_accountNo == accountno)
        totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar_one()
        totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
        # Mask clinumberName for specific account
        totalRecords = []
        for record in totalRecordsUnserialized:
            record_dict = CLINumbersModel.from_orm(record).dict()
            smsflowjson = getattr(record, "s_smsFlowJson", None)
            if smsflowjson and isinstance(smsflowjson, dict):
                sms_members = smsflowjson.get("smsmembers", [])
                if sms_members:
                    record_dict["c_smsMode"] = sms_members[0].get("m_smsMode", "WEB")
                else:
                    record_dict["c_smsMode"] = "WEB"
            else:
                record_dict["c_smsMode"] = "WEB"

            if record_dict.get("a_accountNo") == "3731869027851":
                record_dict["p_peerName"] = "XXXXXXXXXX"
            totalRecords.append(record_dict)
        
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def map(clinumbername: str, clinumberid: int, clinumbermapname: str, callflowid: Optional[int], callflowname: Optional[str], memberids: List[int], smsmembers: List[SMSMember], apiIntegration:str, apis: List[Dict[str, Any]], accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    flowJson = {"version": "V1",
                "smsmembers": [member.model_dump() for member in smsmembers]
                }
    try:
        await session.execute(
            sql_update(CLINumbers)
            .where(CLINumbers.c_clinumberId == clinumberid)
            .values(
                c_clinumbermapName=clinumbermapname,
                c_callflowId=callflowid,
                c_callflowName=callflowname,
                c_apiIntegration=apiIntegration
            )
        )
        result = await session.execute(
            select(CLINumbers.c_clinumberCountryCode)
            .where(CLINumbers.c_clinumberId == clinumberid)
        )
        clinumbercountrycode = result.scalar_one_or_none()
        await session.execute(
            Delete(RelationalCLINumbersMembers).where(
                RelationalCLINumbersMembers.r_clinumberId == clinumberid
            )
        )
        await session.execute(
            Delete(SmsFlow).where(
                SmsFlow.s_smsclinumberId == clinumberid
            )
        )

        smsFlowadd = SmsFlow(
            s_accountId = accountid,
            s_accountNo = accountno,
            s_smsclinumberId = clinumberid,
            s_smsFlowJson = flowJson
        )
        session.add(smsFlowadd)
        
        # Update m_smsMode in p_members for SMS agents
        for member in smsmembers:
            await session.execute(
                sql_update(Members)
                .where(Members.m_memberId == member.memberid)
                .values(m_smsMode=member.m_smsMode)
            )
        for memberid in memberids:
            MemberGroup = RelationalCLINumbersMembers(
                r_accountId = accountid,
                r_accountNo = accountno,
                r_memberId = memberid,
                r_clinumberId = clinumberid
            )
            session.add(MemberGroup)
            
        # await session.execute(Delete(API).where(API.a_cliNumberId == clinumberid))
        # if apiIntegration == "Enable":
        #     for api in apis:
        #         apidic = api.dict()
        #         if apidic["apiType"] not in ["CALLINIT", "POSTCALL"]: 
        #             raise HTTPException(status_code=400, detail=f"Invalid apiType: {apidic['apiType']}")

        #         apiinsert = API(a_cliNumberId = clinumberid, a_apiType = apidic["apiType"], a_apiURL = apidic["apiURL"], a_method = apidic["method"], a_jsonBody = apidic["jsonBody"])
        #         session.add(apiinsert)
            
        if apiIntegration == "Enable":
            for api in apis: 
                apidic = api.dict()
                ExternalIntegrationAPI = ExternalIntegrationAPIs(
                    e_accountId = accountid,
                    e_integrationapiName = apidic["integrationapiname"],
                    e_integrationapiTriggerEvent = apidic["integrationapitriggerevent"],
                    e_integrationapiEndpoint = apidic["integrationapiendpoint"],
                    e_integrationapiMethod = apidic["integrationapimethod"],
                    e_integrationapiHeader = apidic["integrationapiheader"],
                    e_integrationapiQueryParams = apidic["integrationapiqueryparams"]
                )
                session.add(ExternalIntegrationAPI)
                await session.flush()
                integrationapiid = ExternalIntegrationAPI.e_integrationapiId
                RelationalRecord = RelationalExternalIntegrationAPIsCLINumbersCallFlows(
                    r_accountId = accountid,
                    r_callflowId = callflowid,
                    r_clinumberId = clinumberid,
                    r_clinumberName = f"{clinumbercountrycode}{clinumbername}",
                    r_integrationapiId = integrationapiid
                )
                session.add(RelationalRecord)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def mapCallflow(clinumbername: str, wssurl: str, frequency: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        existing = (await session.execute(
            select(CLINumbers).where(
                CLINumbers.c_clinumberName == clinumbername,
                CLINumbers.c_accountId == accountid,
                CLINumbers.c_accountNo == accountno
            )
        )).scalars().first()
        if existing:
            clinumberid = existing.c_clinumberId
        else:
            raise HTTPException(status_code=400, detail=f"Missing Error, '{clinumbername}' does not exist.")

        callflowdata = {"edges": [{"id": "e-start-4", "data": {}, "type": "custom", "source": "start", "target": "4", "animated": False, "sourceHandle": "out", "targetHandle": None}, {"id": "e-4-end", "data": {}, "type": "custom", "source": "4", "target": "end", "animated": False, "sourceHandle": None, "targetHandle": "in"}], "nodes": [{"id": "start", "data": {"label": "Call Start"}, "type": "callStart", "width": 156, "height": 42, "dragging": False, "position": {"x": 119.99999999999994, "y": -0.00000000000002131628207280301}, "selected": False, "positionAbsolute": {"x": 119.99999999999994, "y": -0.00000000000002131628207280301}}, {"id": "end", "data": {"label": "Call End"}, "type": "callEnd", "width": 156, "height": 42, "dragging": False, "position": {"x": 118.66666666666664, "y": 265.99999999999994}, "selected": False, "positionAbsolute": {"x": 118.66666666666664, "y": 265.99999999999994}}, {"id": "4", "data": {"label": "Wss", "wssUrl": wssurl, "frequency": int(frequency)}, "type": "wss", "width": 215, "height": 62, "dragging": False, "position": {"x": 95.33333333333336, "y": 124}, "selected": False, "positionAbsolute": {"x": 95.33333333333336, "y": 124}}]}

        duplicate = (await session.execute(
            select(CallFlows).where(
                CallFlows.c_callflowName == f'callflow-{clinumbername}{accountno}',
                CallFlows.c_accountId == accountid,
                CallFlows.c_accountNo == accountno
            )
        )).scalars().first()
        if duplicate:
            await session.execute(
                Delete(CallFlows).where(
                    CallFlows.c_callflowName == f'callflow-{clinumbername}{accountno}',
                    CallFlows.c_accountId == accountid,
                    CallFlows.c_accountNo == accountno
                )
            )
        CallFlow = CallFlows(
            c_accountId=accountid,
            c_accountNo=accountno,
            c_callflowName=f'callflow-{clinumbername}{accountno}',
            c_callflowData=callflowdata
        )
        session.add(CallFlow)
        await session.flush()

        clinumbermapname = f'mapping-callflow-{clinumbername}{accountno}'
        await session.execute(Update(CLINumbers).where(
            CLINumbers.c_clinumberId == clinumberid
        ).values({
            CLINumbers.c_clinumbermapName: clinumbermapname,
            CLINumbers.c_callflowId: CallFlow.c_callflowId,
            CLINumbers.c_callflowName: f'callflow-{clinumbername}{accountno}',
            CLINumbers.c_apiIntegration: 'Disable'
        }))
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def getCLINumber(clinumberid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(CLINumbers).where(
            CLINumbers.c_clinumberId == clinumberid,
            CLINumbers.c_accountId == accountid,
            CLINumbers.c_accountNo == accountno
        )
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        totalRecords = []
        for record in totalRecordsUnserialized:
            totalRecordsDict = CLINumberGetResponse.CLINumber.from_orm(record).dict()
            memberQuery = select(Members.m_memberId,Members.m_memberName).join(RelationalCLINumbersMembers,RelationalCLINumbersMembers.r_memberId == Members.m_memberId).where(RelationalCLINumbersMembers.r_clinumberId == totalRecordsDict["c_clinumberId"])
            members = (await session.execute(memberQuery)).all()
            totalRecordsDict["members"] = [
                {"m_memberId": member.m_memberId, "m_memberName": member.m_memberName} for member in members
            ]
            apiQuery = select(API.a_apiType, API.a_apiURL, API.a_method, API.a_jsonBody).where(API.a_cliNumberId == totalRecordsDict["c_clinumberId"])
            apiRecords = (await session.execute(apiQuery)).all()
            totalRecordsDict["apis"] = [
                {
                    "apiType": api.a_apiType,
                    "apiURL": api.a_apiURL,
                    "method": api.a_method,
                    "jsonBody": api.a_jsonBody,
                }
                for api in apiRecords
            ]
            smsmembers = await session.execute(select(SmsFlow.s_smsFlowJson).where(SmsFlow.s_smsclinumberId == totalRecordsDict["c_clinumberId"]))
            smsflowjson = smsmembers.scalar_one_or_none()
            if smsflowjson and isinstance(smsflowjson, dict):
                sms_members = smsflowjson.get("smsmembers", [])
                totalRecordsDict["smsmembers"] = sms_members
                if sms_members:
                    totalRecordsDict["c_smsMode"] = sms_members[0].get("m_smsMode", "WEB")
            else:
                totalRecordsDict["smsmembers"] = []
                totalRecordsDict["c_smsMode"] = "WEB"
            totalRecords.append(totalRecordsDict)
        return totalRecords
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def listAccounts(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Accounts)
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        return totalRecordsUnserialized
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def listPeers(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Peers)
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        return totalRecordsUnserialized
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def listCallFlows(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(CallFlows).where(
            CallFlows.c_accountId == accountid,
            CallFlows.c_accountNo == accountno
        )
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        return totalRecordsUnserialized
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def listMembers(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Members).where(
            Members.m_accountId == accountid,
            Members.m_accountNo == accountno,
            Members.m_memberRole == "USER"
        )
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        return totalRecordsUnserialized
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def getPeerID(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        query = select(Peers)
        result = await session.execute(query)
        peers = result.scalars().all() 
        peerlist = {peer.p_peerName: peer for peer in peers}
        return peerlist
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        
async def getAccounts(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        query = select(Accounts)
        result = await session.execute(query)
        Accountsdata = result.scalars().all() 
        Accountlist = {Account.a_accountCode: Account for Account in Accountsdata}
        return Accountlist
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def getIdBasedAccounts(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        query = select(Accounts)
        result = await session.execute(query)
        Accountsdata = result.scalars().all() 
        Accountlist = {Account.a_accountId: Account for Account in Accountsdata}
        return Accountlist
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        
async def checkPhonenumberLimit(cli: dict, accounts: dict, session: AsyncSession) -> tuple[bool, str]:

    account_id = cli["accountid"]
    cli_name = cli.get("clinumbername", "UNKNOWN")
    account = accounts.get(account_id)
    accountdetails = getattr(account, "a_planDetails", None)
    a_accountCode = getattr(account, "a_accountCode", None)
    phonelimit = accountdetails.get("limits", {}).get("features", {}).get("PHONENUMBER")
    count_result = await session.execute(select(func.count(CLINumbers.c_clinumberId)).where(CLINumbers.c_accountId == account_id))
    count = count_result.scalar()
    if count >= phonelimit:
        return False, f"Cannot create CLI {cli_name}, PHONENUMBER limit {phonelimit} exceeded for account {a_accountCode}"
    return True, ""


async def listPhoneNumbers(database: str, accountno: str, memberrole: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (select(
            CLINumbers.c_clinumberId,
            Accounts.a_accountId,
            Accounts.a_accountNo,
            Accounts.a_accountName,
            CLINumbers.c_clinumberName,
            Accounts.a_accountPrefix,
            CLINumbers.c_clinumberCountryCode,
            Peers.p_peerName,
        ).join(Peers, Peers.p_peerId == CLINumbers.c_peerId)
        .outerjoin(Accounts, Accounts.a_accountId == CLINumbers.c_accountId))

        if memberrole != "SUPERADMIN":
            recordQuery = recordQuery.where(CLINumbers.c_accountNo == accountno)
        
        totalRecordsUnserialized = (await session.execute(recordQuery)).all()
        
        totalRecords = []
        for record in totalRecordsUnserialized:
            totalRecords.append({
                "c_clinumberId": record.c_clinumberId,
                "c_clinumberName": record.c_clinumberName,
                "a_accountId": record.a_accountId,
                "a_accountNo": record.a_accountNo,
                "a_accountName": record.a_accountName,
                "a_accountPrefix": record.a_accountPrefix,
                "c_clinumberCountryCode": record.c_clinumberCountryCode,
                "p_peerName": record.p_peerName
            })

        return {
            "totalRecordsCount": len(totalRecords),
            "totalRecords": totalRecords
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def getPhoneNumbers(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str, accountid: int, accountno: str, memberrole:str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (select(
            CLINumbers.c_clinumberId,
            Accounts.a_accountId,
            Accounts.a_accountNo,
            Accounts.a_accountName,
            Accounts.a_accountPrefix,
            CLINumbers.c_clinumberName,
            CLINumbers.c_clinumberType,
            CLINumbers.c_clinumberCountryCode,
            CLINumbers.c_clinumberCountryName,
            CLINumbers.c_clinumberStatus,
            CLINumbers.c_clinumbermapName,
            CLINumbers.c_callflowId,
            CLINumbers.c_callflowName,
            CLINumbers.c_apiIntegration,
            Peers.p_peerId,
            Peers.p_peerName
        ).join(Peers, Peers.p_peerId == CLINumbers.c_peerId)
        .outerjoin(Accounts, Accounts.a_accountId == CLINumbers.c_accountId)
        .outerjoin(RelationalCLINumbersMembers, RelationalCLINumbersMembers.r_clinumberId == CLINumbers.c_clinumberId)
        .outerjoin(Members, Members.m_memberId == RelationalCLINumbersMembers.r_memberId).group_by(CLINumbers.c_clinumberId)
    )
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    CLINumbers.c_clinumberName.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberType.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberCountryCode.ilike(f"%{searchString}%"),
                    CLINumbers.c_clinumberCountryName.ilike(f"%{searchString}%"),
                    Peers.p_peerName.ilike(f"%{searchString}%"),
                    Accounts.a_accountName.ilike(f"%{searchString}%"),
                    Members.m_memberExtensionNo.cast(String).ilike(f"%{searchString}%"),
                    Members.m_memberName.ilike(f"%{searchString}%")
                )
            )
        if sortField and sortOrder:
            recordQuery = recordQuery.order_by(getattr(getattr(CLINumbers, sortField), sortOrder.lower())())
        if memberrole != "SUPERADMIN":
            recordQuery = recordQuery.where(CLINumbers.c_accountNo == accountno)
        totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar_one()
        totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
        totalRecords = [CLINumbersExternalModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def channelcount(database: str, accountid: int, accountno: str, memberrole:str):
    r = redis.Redis(
    host="testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com",
    port=6379,
    decode_responses=True,   # returns str instead of bytes
    socket_timeout=2
)

    value = r.get(accountid)
    print(value)
    return value

async def getPassword(extension: str, database: str):
    redis = get_redis()
    cache_key = f"sip_auth:{database}:{extension}"
    CACHE_TTL = 300  # seconds

    cached = await redis.get(cache_key)
    if cached:
        print(f"Fetched from Redis: {cached}")
        return json.loads(cached)

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Members.m_memberPassword, Members.m_memberExtensionNo).where(
            Members.m_memberExtensionNo == extension
        )
        result = await session.execute(recordQuery)
        records  = [
            {"m_memberPassword": str(row.m_memberPassword), "m_memberExtensionNo": row.m_memberExtensionNo}
            for row in result.all()
        ]

        if records:
            await redis.set(
                cache_key,
                json.dumps(records),
                ex=CACHE_TTL
            )
        print(f"Fetched from Mysql: {records}")
        return records
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
