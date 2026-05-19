from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import select
from fastapi import HTTPException
from db.context import asyncSessionFactory
from models.db import Members, Accounts, SamlConfigs, StateLogs
from models.dto import MembersRelationshipModel

async def getByMemberName(accountcode: str, membername: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
############################### Main Code Block ###############################
            result = await session.execute(
                select(Members).options(joinedload(Members.plan)).where( 
                    Members.m_memberName == membername,
                    Members.m_accountCode == accountcode
                )
            )
            memberDetails = result.scalars().first()
            if not memberDetails:
                return None
            MemberRelationalDetails = getMemberRelationalDetails(memberDetails)
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
        m_memberRole=memberDetails.m_memberRole,
        m_memberExtensionNo=memberDetails.m_memberExtensionNo,
        m_memberCallerId=memberDetails.m_memberCallerId,
        m_memberMobileNo=memberDetails.m_memberMobileNo,
        m_memberMailId=memberDetails.m_memberMailId,
        m_memberMode=memberDetails.m_memberMode,
        m_memberPlatformType=memberDetails.m_memberPlatformType,
        m_campaignId=memberDetails.m_campaignId,
    )
    if memberDetails.plan:
        MemberRelationalDetails.m_memberplanId = memberDetails.plan.m_memberplanId
        MemberRelationalDetails.m_memberplanDetails = memberDetails.plan.m_memberplanDetails
    return MemberRelationalDetails

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



# def getByAccountDomainId(accountDomainId: str, database: str):
#     sync_engine = get_sync_engine(database)
#     Session = sessionmaker(bind=sync_engine, expire_on_commit=False)
#     session = Session()
#     try:
#         return session.query(Accounts).where(
#             Accounts.a_accountDomainId == accountDomainId
#         ).first()
#     finally:
#         session.close()

# def getByMemberMailId(memberMailId: str, database: str):
#     sync_engine = get_sync_engine(database)
#     Session = sessionmaker(bind=sync_engine, expire_on_commit=False)
#     session = Session()
#     try:
#         memberDetails = session.query(Members).where(
#             Members.m_memberMailId == memberMailId
#         ).first()
    
#         MemberRelationalDetails = getMemberRelationalDetails(memberDetails)
#         return MemberRelationalDetails

#     finally:
#         session.close()
#         sync_engine.dispose()

# async def samlConfigure(domain: str, entityid: str, loginurl: str, decodedcontent: str, database: str):
#     async_engine = get_async_engine(database)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         samlconfig = SamlConfigs()
#         samlconfig.s_samlDomain = domain
#         samlconfig.s_samlEntityId = entityid
#         samlconfig.s_samlLoginUrl = loginurl
#         samlconfig.s_samlCertificate = decodedcontent
#         session.add(samlconfig)
#         try:
#             await session.commit()
#             await session.close()
#             return "success"
#         except IntegrityError as e:
#             await session.rollback()
#             await session.close()
#             return str(e.orig)
#     finally:
#         await async_engine.dispose()

# async def getBySamlConfigDomain(domain: str, database: str):
#     sessionmaker_ = get_sessionmaker(database)
#     async with sessionmaker_() as session:
#         result = await session.execute(
#             select(SamlConfigs).where( 
#                 SamlConfigs.s_samlDomain == domain
#             )
#         )
#         samlconfigDetails = result.scalars().first()
#         if samlconfigDetails:
#             return {
#                 "strict": True,
#                 "debug": True,
#                 "sp": {
#                     "entityId": "https://connecthub.pulsework360.com/auth/metadata",
#                     "assertionConsumerService": {
#                         "url": "https://connecthub.pulsework360.com/auth/sso/acs",
#                         "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
#                     },
#                     "singleLogoutService": {
#                         "url": "https://connecthub.pulsework360.com/auth/sso/sls",
#                         "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
#                     },
#                     "x509cert": "",
#                     "privateKey": ""
#                 },
#                 "idp": {
#                     "entityId": samlconfigDetails.s_samlEntityId.strip(),
#                     "singleSignOnService": {
#                         "url": samlconfigDetails.s_samlLoginUrl.strip(),
#                         "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
#                     },
#                     "x509cert": samlconfigDetails.s_samlCertificate.strip()
#                 }
#             }