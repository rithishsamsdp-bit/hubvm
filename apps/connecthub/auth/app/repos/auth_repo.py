from sqlalchemy import select, Update, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from config import settings
from db.context import asyncSessionFactory, get_redis
from models.db import Members, Accounts, ProxyInstances, RelationalProxyInstancesAccounts, SamlConfigs, StateLogs, Teams, PLiveMonitoring,  Subscriber, SSOMemberSyncLogs, MediaInstances
from models.dto import MembersRelationshipModel
from utils.argon2_hashing import HashLib
from redis.exceptions import RedisError
from datetime import datetime, timedelta
import requests, hashlib, json


async def getByMemberName(accountcode: str, membername: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
############################### Main Code Block ###############################
            result = (await session.execute(
            select(Members, ProxyInstances, Accounts)
            .join(RelationalProxyInstancesAccounts, Members.m_accountId == RelationalProxyInstancesAccounts.r_accountId)
            .join(ProxyInstances, RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId)
            .join(Accounts, RelationalProxyInstancesAccounts.r_accountId == Accounts.a_accountId)
            .options(joinedload(Members.MemberPlansRelationship))
            .where(
            Members.m_memberName == membername,
            Members.m_accountCode == accountcode
            )
            )).first()
            if not result:
                return None


            member, proxy, account = result
            
            team_member_extensions = []
            if member.m_memberRole == "TL":
                tlmemberid = member.m_memberId
                tlaccountId = member.m_accountId
                tlaccountNo = member.m_accountNo
                tl_query = await session.execute(select(Teams.t_teamMemberExtensionNo).where(Teams.t_teamLeaderId == tlmemberid, Teams.t_accountId == tlaccountId, Teams.t_accountNo == tlaccountNo))
                team_member_extensions = tl_query.scalars().all()
                
            MemberRelationalDetails = getMemberRelationalDetails(member).copy(update={
            "p_proxyId": proxy.p_proxyId,
            "p_proxyName": proxy.p_proxyName,
            "p_proxyDomainName": proxy.p_proxyDomainName,
            "p_proxyIPAddress": proxy.p_proxyIPAddress,
            "p_proxyPrivateIPAddress": proxy.p_proxyPrivateIPAddress,
            "p_codexName": proxy.p_codexName,
            "p_proxyDirectoryName": proxy.p_proxyDirectoryName,
            "a_accountServiceRegion": account.a_accountServiceRegion,
            "a_accountTimeZone": account.a_accountTimeZone, 
            "t_teamMemberExtensionNo": team_member_extensions
            })
            return MemberRelationalDetails
############################### Main Code Block ###############################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

def getMemberRelationalDetails(memberDetails: Members) -> MembersRelationshipModel:
    MemberRelationalDetails = MembersRelationshipModel(
        m_memberId=memberDetails.m_memberId,
        m_accountId=memberDetails.m_accountId,
        m_accountNo=memberDetails.m_accountNo,
        m_accountCode=memberDetails.m_accountCode,
        m_memberName=memberDetails.m_memberName,
        m_memberPassword=memberDetails.m_memberPassword,
        m_memberPasswordHash=memberDetails.m_memberPasswordHash,
        m_member2FAStatus=memberDetails.m_member2FAStatus,
        m_memberAccessStatus=memberDetails.m_memberAccessStatus,
        m_memberRole=memberDetails.m_memberRole,
        m_memberExtensionNo=memberDetails.m_memberExtensionNo,
        m_memberCallerId=memberDetails.m_memberCallerId,
        m_memberMobileNo=memberDetails.m_memberMobileNo,
        m_memberMailId=memberDetails.m_memberMailId,
        m_memberMode=memberDetails.m_memberMode,
        m_memberPlatformType=memberDetails.m_memberPlatformType,
        m_readyStatus=memberDetails.m_readyStatus,
        m_status=memberDetails.m_status,
        m_statusTime=str(memberDetails.m_statusTime),
        m_campaignId=memberDetails.m_campaignId
    )
    if memberDetails.MemberPlansRelationship:
        MemberRelationalDetails.m_memberplanId = memberDetails.MemberPlansRelationship.m_memberplanId
        MemberRelationalDetails.m_memberplanDetails = memberDetails.MemberPlansRelationship.m_memberplanDetails
    return MemberRelationalDetails

async def getAccountPlanDetails(accountid: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            result = (await session.execute(
                select(Accounts.a_planDetails).where(Accounts.a_accountId == accountid)
            )).scalar_one_or_none()
            return result
        except Exception:
            return None

async def stateLog(statename: str, statetime: str, memberid: int, membername: str, memberrole: str, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
################# Main Code Block #################
            StateLog = StateLogs(
                s_accountId=accountid,
                s_accountNo=accountno,
                s_stateName=statename,
                s_stateTime=statetime,
                s_memberId=memberid,
                s_memberName=membername,
                s_memberRole=memberrole
            )
            session.add(StateLog)
            await session.commit()
################# Main Code Block #################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def getByAccountDomainId(accountDomainId: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
############################### Main Code Block ###############################
            result = await session.execute(
                select(Accounts).where(
                    Accounts.a_accountDomainId == accountDomainId
                )
            )
            return result.scalars().first()
############################### Main Code Block ###############################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def getByMemberMailId(memberMailId: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
############################### Main Code Block ###############################
            from sqlalchemy import func
            result = (await session.execute(
                select(Members, ProxyInstances, Accounts)
                .join(RelationalProxyInstancesAccounts, Members.m_accountId == RelationalProxyInstancesAccounts.r_accountId)
                .join(ProxyInstances, RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId)
                .join(Accounts, RelationalProxyInstancesAccounts.r_accountId == Accounts.a_accountId)
                .options(joinedload(Members.MemberPlansRelationship))
                .where(
                    func.lower(Members.m_memberMailId) == memberMailId.lower()
                )
            )).first()
            if not result:
                return None
            member, proxy, account = result

            team_member_extensions = []
            if member.m_memberRole == "TL":
                tlmemberid = member.m_memberId
                tlaccountId = member.m_accountId
                tlaccountNo = member.m_accountNo
                tl_query = await session.execute(select(Teams.t_teamMemberExtensionNo).where(Teams.t_teamLeaderId == tlmemberid, Teams.t_accountId == tlaccountId, Teams.t_accountNo == tlaccountNo))
                team_member_extensions = tl_query.scalars().all()

            MemberRelationalDetails = getMemberRelationalDetails(member).copy(update={
                "p_proxyId": proxy.p_proxyId,
                "p_proxyName": proxy.p_proxyName,
                "p_proxyDomainName": proxy.p_proxyDomainName,
                "p_proxyIPAddress": proxy.p_proxyIPAddress,
                "p_proxyPrivateIPAddress": proxy.p_proxyPrivateIPAddress,
                "p_codexName": proxy.p_codexName,
                "p_proxyDirectoryName": proxy.p_proxyDirectoryName,
                "a_accountServiceRegion": account.a_accountServiceRegion,
                "a_accountTimeZone": account.a_accountTimeZone, 
                "t_teamMemberExtensionNo": team_member_extensions
            })
            return MemberRelationalDetails
############################### Main Code Block ###############################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def associateFCMToken(token: str, ostype: str, memberid: str, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
#################### Main Code Block ####################
            await session.execute(Update(Members).where(
                Members.m_memberId == int(memberid),
                Members.m_accountId == accountid,
                Members.m_accountNo == accountno
            ).values({
                Members.m_memberFCMToken: token,
                Members.m_memberOSType: ostype
            }))
            await session.commit()
#################### Main Code Block ####################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def cacheOTP(memberdetails: dict, otp: str, database: str):
    redis = get_redis()
    if not redis:
        return None
    try:
#################### Main Code Block ####################
        memberid = memberdetails.m_memberId
        CACHE_OTP_KEY = f"2fa_otp:{database}:{memberid}"
        CACHE_TTL = 300
        data = {
            "2fa_otp": otp,
            "expiry": (datetime.utcnow() + timedelta(seconds=CACHE_TTL)).isoformat()
        }
        await redis.set(
            CACHE_OTP_KEY,
            json.dumps(data),
            ex=CACHE_TTL
        )
        return True
#################### Main Code Block ####################
    except RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis Error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

async def verifyOTP(memberdetails: dict, otp: str, database: str):
    redis = get_redis()
    if not redis:
        return None
    try:
#################### Main Code Block ####################
        memberid = memberdetails.m_memberId
        CACHE_OTP_KEY = f"2fa_otp:{database}:{memberid}"
        CACHE_TTL = 300
        data = await redis.get(CACHE_OTP_KEY)
        if not data:
            raise HTTPException(status_code=200, detail="OTP Expired")
        data = json.loads(data)
        if data["2fa_otp"] != otp:
            raise HTTPException(status_code=200, detail="OTP Invalid")
        await redis.delete(CACHE_OTP_KEY)
        CACHE_2FA_AUTOSKIP_KEY = f"2fa_autoskip:{database}:{memberid}"
        await redis.set(CACHE_2FA_AUTOSKIP_KEY, "true", ex=int(settings.AUTH_TOKEN_EXPIRY.total_seconds()))
        return True
#################### Main Code Block ####################
    except HTTPException:
        raise
    except RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis Error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

async def autoskip2FA(memberdetails: dict, database: str):
    redis = get_redis()
    if not redis:
        return None
    try:
#################### Main Code Block ####################
        CACHE_2FA_AUTOSKIP_KEY = f"2fa_autoskip:{database}:{memberdetails.m_memberId}"
        return await redis.get(CACHE_2FA_AUTOSKIP_KEY)
#################### Main Code Block ####################
    except RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis Error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

async def samlConfigure(domain: str, entityid: str, loginurl: str, decodedcontent: str, accountid: int, provider: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
#################### Main Code Block ####################
            # Find existing config with this provider for this account to update or create new
            result = await session.execute(
                select(SamlConfigs).where(
                    SamlConfigs.s_accountId == accountid,
                    SamlConfigs.s_provider == provider
                )
            )
            samlconfig = result.scalars().first()
            
            if not samlconfig:
                samlconfig = SamlConfigs()
                samlconfig.s_accountId = accountid
                samlconfig.s_provider = provider
                session.add(samlconfig)

            samlconfig.s_samlDomain = domain
            samlconfig.s_samlEntityId = entityid
            samlconfig.s_samlLoginUrl = loginurl
            samlconfig.s_samlCertificate = decodedcontent
            
            await session.commit()
#################### Main Code Block ####################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def getBySamlConfigDomain(domain: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            result = await session.execute(
                select(SamlConfigs).where( 
                    SamlConfigs.s_samlDomain == domain
                )
            )
            samlconfigDetails = result.scalars().first()
            if samlconfigDetails:
                return {
                    "strict": True,
                    "debug": True,
                    "provider": samlconfigDetails.s_provider,
                    "sp": {
                        "entityId": "https://connecthub.pulsework360.com/auth/metadata",
                        "assertionConsumerService": {
                            "url": "https://connecthub.pulsework360.com/auth/sso/acs",
                            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                        },
                        "singleLogoutService": {
                            "url": "https://connecthub.pulsework360.com/auth/sso/sls",
                            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        },
                        "x509cert": "",
                        "privateKey": ""
                    },
                    "idp": {
                        "entityId": samlconfigDetails.s_samlEntityId.strip(),
                        "singleSignOnService": {
                            "url": samlconfigDetails.s_samlLoginUrl.strip(),
                            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        },
                        "x509cert": samlconfigDetails.s_samlCertificate.strip()
                    }
                }
####################################### Main Code Block #######################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def getSAMLConfigByAccountId(accountid: int, database: str, provider: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            query = select(SamlConfigs).where(SamlConfigs.s_accountId == accountid)
            if provider:
                query = query.where(SamlConfigs.s_provider == provider)
            
            result = await session.execute(query)
            return result.scalars().first()
####################################### Main Code Block #######################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def deleteSAMLConfig(accountid: int, database: str, provider: str = 'azure'):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            result = await session.execute(
                select(SamlConfigs).where( 
                    SamlConfigs.s_accountId == accountid,
                    SamlConfigs.s_provider == provider
                )
            )
            samlconfig = result.scalars().first()
            if samlconfig:
                await session.delete(samlconfig)
                await session.commit()
                return True
            return False
####################################### Main Code Block #######################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def updateSyncApis(accountid: int, sync_apis: list, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            result = await session.execute(
                select(SamlConfigs).where( 
                    SamlConfigs.s_accountId == accountid
                )
            )
            samlconfig = result.scalars().first()
            if samlconfig:
                samlconfig.s_synchronize_apis = sync_apis
                await session.commit()
                return True
            return False
####################################### Main Code Block #######################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")






####################################### Azure AD Synq #######################################
# ---------------- ACCOUNT DETAILS ----------------
async def get_account_details(account_id: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        result = await session.execute(
            select(
                Accounts.a_accountNo,
                Accounts.a_accountCode,
                Accounts.a_planDetails
            ).where(Accounts.a_accountId == account_id)
        )
        return result.first()


# ---------------- EXISTING MEMBERS ----------------
async def get_members_by_account(account_id: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        result = await session.execute(
            select(Members).where(Members.m_accountId == account_id)
        )
        return result.scalars().all()


# ---------------- NEXT EXTENSION ----------------
async def get_next_extension(account_id: int, database: str) -> int:
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        stmt = (
            select(Members.m_memberExtensionNo)
            .where(Members.m_accountId == account_id)
            .order_by(desc(Members.m_memberExtensionNo))
            .limit(1)
        )
        result = await session.execute(stmt)
        last_ext = result.scalar_one_or_none()

        return last_ext + 1 if last_ext else int(f"{account_id}1000")


# ---------------- PROXY DETAILS ----------------
async def get_proxy_details(account_id: int):
    sessionmaker = asyncSessionFactory("onedb")
    async with sessionmaker() as session:
        stmt = (
            select(
                ProxyInstances.p_proxyIPAddress,
                ProxyInstances.p_codexName
            )
            .join(
                RelationalProxyInstancesAccounts,
                RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId
            )
            .where(RelationalProxyInstancesAccounts.r_accountId == account_id)
            .limit(1)
        )
        result = await session.execute(stmt)
        return result.first()


# ---------------- INSERT MEMBER ----------------
async def insert_full_member(member: dict, account, account_id: int, extension: int, database: str):
    password = f"{account.a_accountCode}@{extension}"

    main_sessionmaker = asyncSessionFactory(database)
    async with main_sessionmaker() as session:
        member_obj = Members(
            m_accountId=account_id,
            m_accountNo=account.a_accountNo,
            m_accountCode=account.a_accountCode,
            m_memberName=member["name"],
            m_memberPassword=password,
            m_memberPasswordHash=HashLib.hash(password),
            m_memberExtensionNo=extension,
            m_memberMailId=member["email"],
            m_memberAdStatus="ACTIVE",
            m_memberMode="BROWSER",
            m_memberPlatformType="RCM",
            m_status="LOGOUT",
            m_memberRole="USER",
            m_member2FAStatus =""
        )

        session.add(member_obj)
        await session.flush()

        session.add(
            PLiveMonitoring(
                l_memberAccountId=account_id,
                l_membermemberId=member_obj.m_memberId,
                l_memberAccountNo=account.a_accountNo,
                l_memberName=member["name"],
                l_memberExtention=extension
            )
        )
        await session.commit()

    # -------- Proxy / Subscriber --------
    proxy = await get_proxy_details(account_id)
    if not proxy:
        raise Exception("Proxy configuration not found")

    proxy_ip, codex_name = proxy
    subscriber_pass = f"Pulse@#{extension}"
    username = str(extension)

    proxy_sessionmaker = asyncSessionFactory(codex_name)
    async with proxy_sessionmaker() as session:
        exists = await session.execute(
            select(Subscriber).where(
                Subscriber.username == username,
                Subscriber.domain == proxy_ip
            )
        )
        if exists.scalar_one_or_none():
            return

        ha1 = hashlib.md5(
            f"{username}:{proxy_ip}:{subscriber_pass}".encode()
        ).hexdigest()

        session.add(
            Subscriber(
                username=username,
                domain=proxy_ip,
                password=subscriber_pass,
                email_address=member["email"],
                ha1=ha1,
                ha1_sha256="",
                ha1_sha512t256="",
                custId=str(account_id),
                userType="USER"
            )
        )
        await session.commit()


# ---------------- STATUS UPDATES ----------------
async def inactivate_member(email: str, account_id: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        await session.execute(
            Update(Members)
            .where(
                Members.m_accountId == account_id,
                Members.m_memberMailId == email
            )
            .values(m_memberAdStatus="INACTIVE")
        )
        await session.commit()


async def reactivate_member(email: str, account_id: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        await session.execute(
            Update(Members)
            .where(
                Members.m_accountId == account_id,
                Members.m_memberMailId == email
            )
            .values(m_memberAdStatus="ACTIVE")
        )
        await session.commit()


# ---------------- INSERT AUDIT LOG ----------------
async def insert_audit_log(**data):
    sessionmaker = asyncSessionFactory("onedb")
    async with sessionmaker() as s:
        s.add(SSOMemberSyncLogs(
            s_accountId=data.get("s_accountId"),
            s_accountNo=data.get("s_accountNo"),
            s_memberMailId=data.get("s_memberMailId"),
            s_memberName=data.get("s_memberName"),
            s_ssoprovider=data.get("s_ssoprovider"),
            s_syncSource=data.get("s_source"),  # note: 's_source' or 's_syncSource'
            s_syncAction=data.get("s_syncAction"),
            s_groupId=data.get("s_groupId"),
            s_groupName=data.get("s_groupName")
        ))
        await s.commit()

#----------------- GET MEDIA INSTANCES ----------------
async def getMediaInstances(proxyid: int, database: str):
    sessionmaker = asyncSessionFactory("onedb")
    async with sessionmaker() as session:
        try:
            result = (await session.execute(select(MediaInstances).filter(MediaInstances.m_proxyId == proxyid))).scalars().all()
            return result
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")