from fastapi import status
from fastapi.responses import JSONResponse
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema
from config import settings
from models.dto import TokenModel
from repos import auth_repo
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt, requests, random
from urllib.parse import quote
from xmlrpc.client import ServerProxy, Error
from fastapi import status, HTTPException
import asyncio, uuid, jwt, os, xml.etree.ElementTree as ET

conf = ConnectionConfig(
    MAIL_USERNAME="work360@pulse.in",
    MAIL_PASSWORD="yjir ipag lekp hjxu",
    MAIL_FROM="work360@pulse.in",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
def encode(memberDetails: dict, expiry: Optional[timedelta] = None):
    
    if expiry is None:
        expiry = timedelta(days=1)
        
    token = TokenModel(
        m_memberId = memberDetails.m_memberId,
        m_accountId = memberDetails.m_accountId,
        m_accountNo = memberDetails.m_accountNo,
        m_accountCode = memberDetails.m_accountCode,
        m_memberName = memberDetails.m_memberName,
        m_memberPassword = memberDetails.m_memberPassword,
        m_memberRole = memberDetails.m_memberRole,
        m_memberExtensionNo = memberDetails.m_memberExtensionNo,
        m_memberCallerId = memberDetails.m_memberCallerId,
        m_memberMobileNo = memberDetails.m_memberMobileNo,
        m_memberMailId = memberDetails.m_memberMailId,
        m_memberMode = memberDetails.m_memberMode,
        m_memberPlatformType = memberDetails.m_memberPlatformType,
        m_readyStatus = memberDetails.m_readyStatus,
        m_status = memberDetails.m_status,
        m_statusTime = memberDetails.m_statusTime,
        m_campaignId = memberDetails.m_campaignId,
        m_memberplanId = memberDetails.m_memberplanId,
        m_memberplanDetails = memberDetails.m_memberplanDetails,
        p_proxyId = memberDetails.p_proxyId,
        p_proxyName = memberDetails.p_proxyName,
        p_proxyDomainName = memberDetails.p_proxyDomainName,
        p_proxyIPAddress = memberDetails.p_proxyIPAddress,
        p_proxyPrivateIPAddress = memberDetails.p_proxyPrivateIPAddress,
        p_codexName = memberDetails.p_codexName,
        p_proxyDirectoryName = memberDetails.p_proxyDirectoryName,
        exp = datetime.now(timezone.utc) + expiry,
        accountEncryption = memberDetails.m_accountNo,
        a_accountTimeZone = memberDetails.a_accountTimeZone,
        a_accountServiceRegion = memberDetails.a_accountServiceRegion,
        t_teamMemberExtensionNo = memberDetails.t_teamMemberExtensionNo
    )
    return jwt.encode(token.model_dump(), settings.AUTH_TOKEN_SECRET_KEY, algorithm=settings.AUTH_TOKEN_ALGORITHM)
    
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

async def getByMemberName(accountcode: str, membername: str, database: str):
    return await auth_repo.getByMemberName(accountcode.strip(), membername.strip(), database.strip())

async def getAccountPlanDetails(accountid: int, database: str):
    return await auth_repo.getAccountPlanDetails(accountid, database)

async def stateLog(statename: str, memberDetails: dict):
    memberid = memberDetails.m_memberId
    memberrole = memberDetails.m_memberRole
    membername = memberDetails.m_memberName
    accountid = memberDetails.m_accountId
    accountno = memberDetails.m_accountNo
    proxyid = memberDetails.p_proxyId
    memberExtensionNo = memberDetails.m_memberExtensionNo
    database = "onedb"
    mediainstances = await auth_repo.getMediaInstances(proxyid, database)
    if mediainstances:
        command = f"id {memberExtensionNo}"
        tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, command) for mediainstance in mediainstances]
        await asyncio.gather(*tasks, return_exceptions=True)
    statetime = datetime.now(timezone.utc)
    return await auth_repo.stateLog(statename, statetime, memberid, membername, memberrole, accountid, accountno, database)

async def getByMemberMailId(memberMailId: str, database: str):
    return await auth_repo.getByMemberMailId(memberMailId.strip().lower(), database.strip())

async def getByAccountDomainId(accountDomainId: str, database: str):
    return await auth_repo.getByAccountDomainId(accountDomainId.strip().lower(), database.strip())

async def associateFCMToken(request: dict, accountid: int, accountno: str, database: str):
    return await auth_repo.associateFCMToken(request.token, request.ostype, request.memberid, accountid, accountno, database)

async def generateOTP(memberdetails: dict, database: str):
    otp = str(random.randint(100000, 999999))
    await auth_repo.cacheOTP(memberdetails, otp, database)
    return otp

async def verifyOTP(memberdetails: dict, otp: str, database: str):
    await auth_repo.verifyOTP(memberdetails, otp, database)

async def autoskip2FA(memberdetails: dict, database: str):
    return await auth_repo.autoskip2FA(memberdetails, database)

async def samlConfigure(domain: str, entityid: str, loginurl: str, decodedcontent: str, accountid: int, provider: str, database: str):
    return await auth_repo.samlConfigure(domain.strip().lower(), entityid.strip(), loginurl.strip(), decodedcontent, accountid, provider, database)

async def getBySamlConfigDomain(domain: str, database: str):
    return await auth_repo.getBySamlConfigDomain(domain.strip().lower(), database.strip())

async def getSAMLConfigByAccountId(accountid: int, database: str, provider: Optional[str] = None):
    return await auth_repo.getSAMLConfigByAccountId(accountid, database.strip(), provider)

async def deleteSAMLConfig(accountid: int, database: str, provider: str = 'azure'):
    return await auth_repo.deleteSAMLConfig(accountid, database.strip(), provider)

async def updateSyncApis(accountid: int, sync_apis: list, database: str):
    return await auth_repo.updateSyncApis(accountid, sync_apis, database.strip())


def get_azure_access_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials"
    }

    res = requests.post(url, data=data, timeout=10)
    res.raise_for_status()
    return res.json()["access_token"]


def fetch_azure_app_assignments(token: str, app_object_id: str) -> list:
    url = f"{GRAPH_BASE}/servicePrincipals/{app_object_id}/appRoleAssignedTo"
    headers = {"Authorization": f"Bearer {token}"}

    results = []
    while url:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()

        results.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    return results


def fetch_user_details(token: str, user_id: str) -> dict:
    url = f"{GRAPH_BASE}/users/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}

    res = requests.get(url, headers=headers, timeout=10)
    res.raise_for_status()
    return res.json()
    
def fetch_user_details_employeeId(token: str, user_id: str) -> dict:
    url = f"{GRAPH_BASE}/users/{user_id}?$select=displayName,employeeId"
    headers = {"Authorization": f"Bearer {token}"}

    res = requests.get(url, headers=headers, timeout=10)
    res.raise_for_status()
    return res.json()

def fetch_group_details(token: str, group_id: str) -> dict:
    url = f"{GRAPH_BASE}/groups/{group_id}"
    headers = {"Authorization": f"Bearer {token}"}

    res = requests.get(url, headers=headers, timeout=10)
    res.raise_for_status()
    return res.json()


def fetch_group_members(token: str, group_id: str) -> list:
    url = f"{GRAPH_BASE}/groups/{group_id}/members"
    headers = {"Authorization": f"Bearer {token}"}

    users = []
    while url:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()

        for entry in data.get("value", []):
            if entry.get("@odata.type") == "#microsoft.graph.user":
                users.append({
                    "principalId": entry.get("id"),
                    "displayName": entry.get("displayName"),
                    "userPrincipalName": entry.get("userPrincipalName")
                })

        url = data.get("@odata.nextLink")

    return users

async def SamlSync(tenant_id: str, client_id: str, client_secret: str, app_object_id: str, accountId: int):
    DATABASE = "onedb"

    token = get_azure_access_token(tenant_id, client_id, client_secret)
    assignments = fetch_azure_app_assignments(token, app_object_id)

    api_users = {}
    direct_users = []
    groups = []

    for a in assignments:
        if a["principalType"] == "User":
            u = fetch_user_details(token, a["principalId"])
            email = u.get("userPrincipalName")
            if email:
                employee_id = None
                if accountId == 13:
                    emp = fetch_user_details_employeeId(token, a["principalId"])
                    employee_id = emp.get("employeeId")
                    api_users[email] = {
                        "id": str(u.get("id")) if u.get("id") else "", 
                        "name": employee_id,
                        "email": email,
                        "source": "DIRECT",
                        "groupId": None,
                        "groupName": None
                    }
                else:
                    api_users[email] = {
                        "id": str(u.get("id")) if u.get("id") else "", 
                        "name": u.get("displayName"),
                        "email": email,
                        "source": "DIRECT",
                        "groupId": None,
                        "groupName": None
                    }
                direct_users.append(api_users[email])

        elif a["principalType"] == "Group":
            members = fetch_group_members(token, a["principalId"])
            grp_members = []

            for m in members:
                email = m.get("userPrincipalName")
                if email:
                        employee_id = None
                        if accountId == 13:
                            emp = fetch_user_details_employeeId(token, a["principalId"])
                            employee_id = emp.get("employeeId")                    
                            api_users[email] = {
                            "id": str(m.get("principalId")) if m.get("principalId") else "",   # safe access, might be None
                                "name": employee_id,
                                "email": email,
                                "source": "GROUP",
                                "groupId": a["principalId"],
                                "groupName": a["resourceDisplayName"]
                            }
                            grp_members.append(api_users[email])

                        else:
                            api_users[email] = {
                            "id": str(m.get("principalId")) if m.get("principalId") else "",   # safe access, might be None
                                "name": m.get("displayName"),
                                "email": email,
                                "source": "GROUP",
                                "groupId": a["principalId"],
                                "groupName": a["resourceDisplayName"]
                            }
                            grp_members.append(api_users[email])

            groups.append({
                "id": a["principalId"],
                "name": a["resourceDisplayName"],
                "members": grp_members
            })

    account = await auth_repo.get_account_details(accountId, DATABASE)
    db_users = await auth_repo.get_members_by_account(accountId, DATABASE)
    db_map = {u.m_memberMailId: u for u in db_users}
    current_ext = await auth_repo.get_next_extension(accountId, DATABASE)

    for email, user in api_users.items():
        if email not in db_map:
            await auth_repo.insert_full_member(user, account, accountId, current_ext, DATABASE)
            action = "INSERTED"
            current_ext += 1
        elif db_map[email].m_memberAdStatus == "INACTIVE":
            await auth_repo.reactivate_member(email, accountId, DATABASE)
            action = "REACTIVATED"
        else:
            action = "UNCHANGED"

        await auth_repo.insert_audit_log(
            s_accountId=accountId,
            s_accountNo=account.a_accountNo,
            s_memberMailId=email,
            s_memberName=user["name"],
            s_ssoprovider=None,
            s_source=user["source"],
            s_syncAction=action,
            s_groupId=user.get("groupId"),
            s_groupName=user.get("groupName")
        )

    for email in set(db_map) - set(api_users):
        await auth_repo.inactivate_member(email, accountId, DATABASE)
        await auth_repo.insert_audit_log(
            s_accountId=accountId,
            s_accountNo=account.a_accountNo,
            s_memberMailId=email,
            s_memberName=db_map[email].m_memberName,
            s_ssoprovider=None,
            s_source="DIRECT",
            s_syncAction="INACTIVATED",
            s_groupId=None,
            s_groupName=None
        )

    return {
        "appObjectId": app_object_id,
        "directUsers": direct_users,
        "groups": groups
    }

async def sendMail(memberdetails:dict, otp: str):
    recipientmailid = memberdetails.m_memberMailId
    recipientname = memberdetails.m_memberName
    subject = "One-Time Password (OTP) for Your Pulse Account"

    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color:#FAFAFA; padding:20px; margin:0;">
        <div style="max-width:600px; margin:auto; background:#FFFFFF; padding:30px; border-radius:12px; border:1px solid #ff5200; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <h2 style="color:#ff5200; text-align:center; margin-bottom:20px;">🔐 Pulse Security Verification</h2>
        
        <!-- Greeting -->
        <p style="font-size:16px; color:#333; line-height:1.6;">
            Hello <strong>{recipientname}</strong>,
        </p>

        <p style="font-size:15px; color:#333; line-height:1.6;">
            We received a request to log in to your Pulse account.  
            Please use the One-Time Password (OTP) below to complete your verification:
        </p>

        <!-- OTP Box -->
        <div style="background:#FAFAFA; padding:25px; border:1px dashed #ff5200; border-radius:10px; margin:25px 0; text-align:center;">
            <p style="font-size:14px; color:#555; margin-bottom:10px;">Your OTP Code</p>
            <p style="font-size:32px; font-weight:bold; color:#ff5200; letter-spacing:6px; margin:0;">
                {otp}
            </p>
        </div>

        <!-- Expiry -->
        <p style="font-size:14px; color:#555; line-height:1.6;">
            ⏳ This OTP is valid for <b>5 minutes</b>. Please do not share this code with anyone.
        </p>

        <!-- Warning -->
        <p style="font-size:14px; color:#D32F2F; line-height:1.6; margin-top:15px;">
            If you did not request this login, please ignore this email or contact support immediately.
        </p>

        <!-- Support -->
        <p style="font-size:14px; color:#555; line-height:1.6; margin-top:20px;">
            Need help? Reach out to us:
        </p>
        <ul style="font-size:14px; color:#555; line-height:1.8; padding-left:18px;">
            <li>📞 Phone: <a href="tel:+914440001800" style="color:#ff5200; text-decoration:none;">+91 44 4000 1800</a></li>
            <li>📧 Email: <a href="mailto:support@pulse.in" style="color:#ff5200; text-decoration:none;">support@pulse.in</a></li>
            <li>🌐 Website: <a href="https://pulse.in" style="color:#ff5200; text-decoration:none;">pulse.in</a></li>
        </ul>

        <!-- Footer -->
        <p style="font-size:13px; color:#888; margin-top:30px; text-align:center; line-height:1.5;">
            This is an automated message. Please do not reply.  
            <br>Regards,<br><b>Pulse Security Team</b>
        </p>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=subject,
        recipients=[recipientmailid],
        body=body,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def reloadMod(host: str, command: str):
    def _run_reload():
        username = quote(settings.FS_XML_RPC_USERNAME, safe='')
        password = quote(settings.FS_XML_RPC_PASSWORD, safe='')
        try:
            server = ServerProxy(f"http://{username}:{password}@{host}:{settings.FS_XML_RPC_PORT}/RPC2", allow_none=True)
            server.freeswitch.api("xml_flush_cache", command)
        except Error as e:
            raise HTTPException(status_code=404, detail=f"XML-RPC Error on {host}: {e}")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Connection failed on {host}: {e}")
    await asyncio.to_thread(_run_reload)
