from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import report_repo
import jwt

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

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

async def fetch(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, type: str, dialmethod: str, accountid: int, accountno: str, memberId: int, memberrole: str,accountTimeZone: str, database: str) -> dict:
    return await report_repo.fetch(limit, offset, sortorder, sortfield, searchstring, campaignid, calldisposition, calldirection, callmode, calldatestartrange, calldateendrange, type, dialmethod, accountid, accountno, memberId, memberrole,accountTimeZone, database)

async def globalfetch(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, type: str, dialmethod: str, accountid: int, accountno: str, memberId: int, memberrole: str,accountTimeZone: str, database: str) -> dict:
    if accountid == 1:
        return await report_repo.globalfetch(limit, offset, sortorder, sortfield, searchstring, campaignid, calldisposition, calldirection, callmode, calldatestartrange, calldateendrange, type, dialmethod, accountid, accountno, memberId, memberrole,accountTimeZone, database)
    else:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Invalid Account"
            }
        )

async def fetchAgent(limit: int, offset: int, sortorder: str, sortfeld: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, accountid: int, accountno: str, memberextensionno:str,accountTimeZone: str, database: str) -> dict:
    return await report_repo.fetchAgent(limit, offset, sortorder, sortfeld, searchstring, campaignid, calldisposition, calldirection, callmode, calldatestartrange, calldateendrange, accountid, accountno, memberextensionno,accountTimeZone, database)

async def listCampaign(accountid: int, accountno: str, database: str):
    return await report_repo.listCampaign(accountid, accountno, database)

async def productionreport(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type: str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int) -> dict:
    return await report_repo.productionreport(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId)

async def loginreport(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type:str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int) -> dict:
    return await report_repo.loginreport(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId)

async def voiceReportFetch(limit: int, offset: int, sortOrder: str, sortField: str, search: any, callDateStartRange: str, callDateEndRange: str, accountid: int, accountno: str, database: str, m_memberExtensionNo:str) -> dict:
    return await report_repo.voiceReportFetch(limit, offset, sortOrder, sortField, search, callDateStartRange, callDateEndRange, accountid, accountno, database, m_memberExtensionNo)

async def Break(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type:str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int) -> dict:
    return await report_repo.Break(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId)

async def conference(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type:str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int) -> dict:
    return await report_repo.conference(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId)

async def queuemissed(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type:str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int) -> dict:
    return await report_repo.queuemissed(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId)

async def missedcalls(limit: int, offset: int,  callDateStartRange: str, callDateEndRange: str, search:str, type:str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int, account_timezone: str = None, memberextensionno: str = None) -> dict:
    return await report_repo.missedcalls(limit, offset, callDateStartRange, callDateEndRange, search, type, accountid, accountno, database, memberRole, memberId, account_timezone, memberextensionno)

async def createAutomation(accountid: int, accountno: str, name: str, reportName: str, schedule: str, time: str, day: str, dataRange: str, toEmail: str, ccEmail: list, extensionFilter: list, timezoneFilter: str, fieldsFilter: list, database: str):
    return await report_repo.create_mail_automation(accountid, accountno, name, reportName, schedule, time, day, dataRange, toEmail, ccEmail, extensionFilter, timezoneFilter, fieldsFilter, database)

async def fetchAutomation(accountid: int, accountno: str, limit: int, offset: int, database: str):
    return await report_repo.fetch_mail_automation(accountid, accountno, limit, offset, database)

async def deleteAutomation(accountid: int, accountno: str, automation_id: int, database: str):
    return await report_repo.delete_mail_automation(accountid, accountno, automation_id, database)

async def updateAutomation(accountid: int, accountno: str, automation_id: int, name: str, reportName: str, schedule: str, time: str, day: str, dataRange: str, toEmail: str, ccEmail: list, extensionFilter: list, timezoneFilter: str, fieldsFilter: list, status: str, database: str):
    return await report_repo.update_mail_automation(accountid, accountno, automation_id, name, reportName, schedule, time, day, dataRange, toEmail, ccEmail, extensionFilter, timezoneFilter, fieldsFilter, status, database)

async def toggleAutomationStatus(accountid: int, accountno: str, automation_id: int, database: str):
    return await report_repo.toggle_mail_automation_status(accountid, accountno, automation_id, database)

async def mail_cdr_fetch(limit, offset, sortorder, sortfield, searchstring, campaignid, calldisposition, calldirection, callmode, calldatestartrange, calldateendrange, type, dialmethod, accountid, accountno, memberId, memberrole, database, include_followups, extensionFilter=None, timezoneFilter=None, fieldsFilter=None):
    return await report_repo.mail_cdr_fetch(limit, offset, sortorder, sortfield, searchstring, campaignid, calldisposition, calldirection, callmode, calldatestartrange, calldateendrange, type, dialmethod, accountid, accountno, memberId, memberrole, database, include_followups, extensionFilter, timezoneFilter, fieldsFilter)

async def reportwebhook(unique_call_identifier:str, m_accountId:int, m_accountNo:str, m_memberId:int, database:str):
    return await report_repo.reportwebhook(unique_call_identifier, m_accountId, m_accountNo, m_memberId, 'onedb')

async def sms_dlr_report(limit, offset, search, fromDate, toDate, sortField, sortOrder, status_filter, direction, accountId, accountNo, export):
    return await report_repo.sms_dlr_report(limit, offset, search, fromDate, toDate, sortField, sortOrder, status_filter, direction, accountId, accountNo, export)

