
from sqlalchemy import select, desc, Delete, Update, or_, and_, func, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.sql.functions import current_timestamp
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from db.context import  get_async_engine, get_async_engineO
from models import db
from models import dto
from models.db import Members, Accounts, ProxyInstances, MediaInstances, RelationalProxyInstancesAccounts, MemberPlans, PLiveMonitoring
from utils.argon2_hashing import HashLib
from utils.export import cdrexport
from datetime import datetime
from typing import Optional
import hashlib

async def create(accountEncryption: str, validUsers: list, requestType:str):
    results = []
    errors = []

    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    for user in validUsers:
        
        session = async_session_maker()
        sessionO = None
        async_engineO = None
        try:
            acc = (
                select(Accounts, ProxyInstances)
                .join(
                    RelationalProxyInstancesAccounts,
                    Accounts.a_accountId == RelationalProxyInstancesAccounts.r_accountId
                )
                .join(
                    ProxyInstances,
                    RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId
                )
                .where(Accounts.a_accountId == user.m_accountId)
            )
            result = await session.execute(acc)
            rows = result.first()

            if not rows:
                errors.append({"user": user.m_memberName, "message": "Account doesn't exist"})
                continue

            account, proxy = rows
            a_planDetails = account.a_planDetails
            a_accountId = account.a_accountId
            a_accountNo = account.a_accountNo
            a_accountCode = account.a_accountCode
            a_accountServiceRegion = account.a_accountServiceRegion

            proxyDomainName = proxy.p_proxyDomainName
            codexName = proxy.p_codexName
            p_proxyIPAddress = proxy.p_proxyIPAddress
            proxyDirectoryName = proxy.p_proxyDirectoryName

            user_ext = (
                user.m_memberExtensionNo.strip()
                if user.m_memberExtensionNo and user.m_memberExtensionNo.strip()
                else None
            )
            if user_ext is None:
                # ---- AUTO-GENERATE EXTENSION ----
                lastmember_stmt = (
                    select(Members.m_memberExtensionNo)
                    .where(Members.m_accountId == a_accountId)
                    .order_by(desc(Members.m_memberExtensionNo))
                    .limit(1)
                )
                lastmemberresult = await session.execute(lastmember_stmt)
                last_ext = lastmemberresult.scalar_one_or_none()

                if last_ext is not None:
                    newExt = int(last_ext) + 1
                else:
                    newExtstr = str(a_accountId) + "1000"
                    newExt = int(newExtstr)

            else:
                # ---- USER-PROVIDED EXTENSION ----
                newExt = int(f"{accountEncryption}{user_ext}")
            particularplan = a_planDetails["roles"][user.m_memberRole]
            m_memberPasswordHash = HashLib.hash(user.m_memberPassword)
            # Create Member
            member = Members(
                m_accountId=a_accountId,
                m_accountNo=a_accountNo,
                m_accountCode=a_accountCode,
                m_memberName=user.m_memberName,
                m_memberPassword=user.m_memberPassword,
                m_memberPasswordHash=user.m_memberPasswordHash,
                m_memberExtensionNo=newExt,
                m_memberRole=user.m_memberRole,
                m_memberCallerIdMode=user.m_memberCallerIdMode,
                m_memberCallerId=user.m_memberCallerId,
                m_memberMobileNo=user.m_memberMobileNo,
                m_memberMailId=user.m_memberMailId,
                m_memberMode=user.m_memberMode,
                m_memberPlatformType=user.m_memberPlatformType
            )
            session.add(member)
            await session.flush()

            # Add LiveMonitoring if USER
            if user.m_memberRole == 'USER':
                LiveMonitoring = PLiveMonitoring(
                    l_memberAccountId=a_accountId,
                    l_membermemberId=member.m_memberId,
                    l_memberAccountNo=a_accountNo,
                    l_memberName=user.m_memberName,
                    l_memberExtention=newExt
                )
                session.add(LiveMonitoring)

            await session.commit()

            # Add MemberPlans
            planMember = MemberPlans(
                m_memberplanDetails=particularplan,
                m_memberId=member.m_memberId
            )
            session.add(planMember)
            await session.commit()

            # Insert into Proxy Subscriber
            async_engineO = get_async_engineO(codexName)
            asyncO_session_maker = sessionmaker(async_engineO, expire_on_commit=False, class_=AsyncSession)
            sessionO = asyncO_session_maker()
            if user.m_memberMode == "BROWSER":
                subscriberpas = f"Pulse@#{newExt}"
                await sessionO.execute(
                    text("""INSERT INTO subscriber 
                            (username, domain, password, email_address, ha1, custId, userType) 
                            VALUES (:username, :domain, :password, :email, :ha1, :custId, :userType)"""),
                    {
                        "username": newExt,
                        "domain": p_proxyIPAddress,
                        "password": subscriberpas,
                        "email": user.m_memberMailId,
                        "ha1": hashlib.md5(f"{newExt}:{p_proxyIPAddress}:{subscriberpas}".encode()).hexdigest(),
                        "custId": str(a_accountId),
                        "userType": user.m_memberRole
                    }
                )
                await sessionO.commit()
            else:
                subscriberpas = user.m_memberPassword
                await sessionO.execute(
                    text("""INSERT INTO subscriber 
                            (username, domain, password, email_address, ha1, custId, userType) 
                            VALUES (:username, :domain, :password, :email, :ha1, :custId, :userType)"""),
                    {
                        "username": newExt,
                        "domain": p_proxyIPAddress,
                        "password": subscriberpas,
                        "email": user.m_memberMailId,
                        "ha1": hashlib.md5(f"{newExt}:{p_proxyIPAddress}:{subscriberpas}".encode()).hexdigest(),
                        "custId": str(a_accountId),
                        "userType": user.m_memberRole
                    }
                )
                await sessionO.commit()
                

            results.append({"user": user.m_memberName, "message": "User created successfully"})

        except IntegrityError as e:
            await session.rollback()
            errors.append({"user": getattr(user, "m_memberName", None), "message": f"Integrity Error: {str(e.orig)}"})

        except SQLAlchemyError as e:
            await session.rollback()
            errors.append({"user": getattr(user, "m_memberName", None), "message": f"Database Error: {str(e)}"})

        except Exception as e:
            await session.rollback()
            errors.append({"user": getattr(user, "m_memberName", None), "message": f"Unexpected Error: {str(e)}"})

        finally:
            if session:
                await session.close()
            if sessionO:
                await sessionO.close()
            if async_engineO:
                await async_engineO.dispose()

    if async_engine:
        await async_engine.dispose()

    if requestType == "UPLOAD":
        print("checking")
    
    return {"success": results, "errors": errors}


# Validate a Member
async def validator(accountEncryption:str, vtype: str, vvalue: str, m_accountCode:str, m_memberId: Optional[int] = None):

    if vtype == "m_memberName":
        conditions = [
                    Members.m_memberName == vvalue,
                    Members.m_accountCode == m_accountCode,
            ]
        if m_memberId:
            conditions.append(Members.m_memberId != m_memberId)
            
        query = select(Members).where(and_(*conditions))
        
        try:
            async_engine = get_async_engine(accountEncryption)
            async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
            session = async_session_maker()
            result = await session.execute(query)
            membername = result.scalars().first()

            if membername:
                return {"status_code": 409, "message": "UserName already exists", "status": True}
            else:
                return {"status_code": 200, "message": "UserName is valid", "status": False}
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

        finally:
            await session.close()
            await async_engine.dispose()

    elif vtype == "m_memberMailId":
        conditions = [
            Members.m_memberMailId == vvalue,
        ]
        if m_memberId:
            conditions.append(Members.m_memberId != m_memberId)
            
        query = select(Members).where(and_(*conditions))
        
        try:
            async_engine = get_async_engine(accountEncryption)
            async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
            session = async_session_maker()
            result = await session.execute(query)
            memberMail = result.scalars().first()

            if memberMail:
                return {"status_code": 409, "message": "MailID already exists", "status": True}
            else:
                return {"status_code": 200, "message": "MailID is valid", "status": False}
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

        finally:
            await session.close()
            await async_engine.dispose()

    elif vtype == "m_memberExtensionNo":
        conditions = [
            Members.m_memberExtensionNo == int(f"{accountEncryption}{vvalue}"),
            Members.m_accountId == accountEncryption,
        ]
        if m_memberId:
            conditions.append(Members.m_memberId != m_memberId)
            
        query = select(Members).where(and_(*conditions))
        
        try:
            async_engine = get_async_engine(accountEncryption)
            async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
            session = async_session_maker()
            result = await session.execute(query)
            memberExtension = result.scalars().first()

            if memberExtension:
                return {"status_code": 409, "message": "ExtensionNo already exists", "status": True}
            else:
                return {"status_code": 200, "message": "ExtensionNo is valid", "status": False}
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

        finally:
            await session.close()
            await async_engine.dispose()

async def updateSubscriber(accountEncryption: str, m_accountId:int, m_memberId: str, m_memberName: str, m_memberPassword: str, m_memberPasswordHash: str, m_memberRole: str, m_memberCallerIdMode:str, m_memberCallerId: str, m_memberMobileNo: str, m_memberMailId: str, m_memberMode: str, m_memberPlatformType:str):
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    sessionO = None
    async_engineO = None
    try:
        result = (await session.execute(
            select(Members, ProxyInstances)
            .join(RelationalProxyInstancesAccounts, Members.m_accountId == RelationalProxyInstancesAccounts.r_accountId)
            .join(ProxyInstances, RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId)
            .where(
                Members.m_memberId == m_memberId,
                Members.m_accountId == m_accountId
            )
        )).first()
        if not result:
            raise HTTPException(status_code=404, detail=f"Member Not Found")
        member, proxy = result
        codexName = proxy.p_codexName
        p_proxyIPAddress  = proxy.p_proxyIPAddress
        extMember = member.m_memberExtensionNo
        member.m_memberName = m_memberName
        member.m_memberPassword = m_memberPassword
        member.m_memberPasswordHash = m_memberPasswordHash
        member.m_memberRole = m_memberRole
        member.m_memberCallerIdMode = m_memberCallerIdMode
        member.m_memberCallerId = m_memberCallerId
        member.m_memberMobileNo = m_memberMobileNo
        member.m_memberMailId = m_memberMailId
        member.m_memberMode = m_memberMode
        await session.commit()
        print(f"{codexName}-dbname")
        async_engineO = get_async_engineO(codexName)
        asyncO_session_maker = sessionmaker(async_engineO, expire_on_commit=False, class_=AsyncSession)
        sessionO = asyncO_session_maker()
        if member.m_memberMode == "BROWSER":
            subscriberpas = f"Pulse@#{member.m_memberExtensionNo}"
            await sessionO.execute(text("""UPDATE subscriber SET password = :password, ha1 = :ha1, userType = :userType WHERE username = :username"""),{"password": subscriberpas,"ha1": hashlib.md5(f"{extMember}:{p_proxyIPAddress}:{subscriberpas}".encode()).hexdigest(),"userType":m_memberRole,"username": extMember})
            await sessionO.commit()
        else:
            subscriberpas = m_memberPassword
            await sessionO.execute(text("""UPDATE subscriber SET password = :password, ha1 = :ha1, userType = :userType WHERE username = :username"""),{"password": subscriberpas,"ha1": hashlib.md5(f"{extMember}:{p_proxyIPAddress}:{subscriberpas}".encode()).hexdigest(),"userType":m_memberRole,"username": extMember})
            await sessionO.commit()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Member Updated Successfully"}
        )
        
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        if session:
            await session.close()
        if sessionO:
            await sessionO.close()
        if async_engine:
            await async_engine.dispose()
        if async_engineO:
            await async_engineO.dispose()

# Update a Member  
async def update(accountEncryption: str, m_accountId:int, m_memberId: str, m_memberName: str, m_memberPassword: str, m_memberPasswordHash: str, m_memberRole: str, m_memberCallerIdMode:str, m_memberCallerId: str, m_memberMobileNo: str, m_memberMailId: str, m_memberMode: str, m_memberPlatformType:str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            result = await session.execute(
                select(Members.m_memberExtensionNo)
                .where(
                    Members.m_accountId == m_accountId,
                    Members.m_memberId == m_memberId
                )
            )
            member_extension = result.scalar_one_or_none()
            if member_extension is None:
                raise HTTPException(status_code=404, detail="Member not found")
            stmt = (
                Update(Members)
                .where(
                    Members.m_accountId == m_accountId,
                    Members.m_memberId == m_memberId
                )
                .values(
                    m_memberName=m_memberName,
                    m_memberPassword=m_memberPassword,
                    m_memberPasswordHash=m_memberPasswordHash,
                    m_memberRole=m_memberRole,
                    m_memberCallerIdMode=m_memberCallerIdMode,
                    m_memberCallerId=m_memberCallerId,
                    m_memberMobileNo=m_memberMobileNo,
                    m_memberMailId=m_memberMailId,
                    m_memberMode=m_memberMode,
                    m_memberPlatformType=m_memberPlatformType
                )
            )
            await session.execute(stmt)
            await session.commit()
            return member_extension
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
        finally:
            await async_engine.dispose()

async def getProxyInstances(accountid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            stmt = (
                select(ProxyInstances)
                .join(
                    RelationalProxyInstancesAccounts,
                    ProxyInstances.p_proxyId == RelationalProxyInstancesAccounts.r_proxyId
                )
                .where(RelationalProxyInstancesAccounts.r_accountId == accountid)
            )
            result = await session.execute(stmt)
            proxy_instance = result.scalars().one_or_none()
            return proxy_instance
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
        finally:
            await async_engine.dispose()

async def getMediaInstances(proxyid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
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
    finally:
        await session.close()
        await async_engine.dispose()

 # Delete a Member       
async def delete(accountEncryption: str,m_accountId:int,m_memberId: str):

    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:
        result = (await session.execute(
            select(Members, ProxyInstances)
            .join(RelationalProxyInstancesAccounts, Members.m_accountId == RelationalProxyInstancesAccounts.r_accountId)
            .join(ProxyInstances, RelationalProxyInstancesAccounts.r_proxyId == ProxyInstances.p_proxyId)
            .where(
                Members.m_memberId == m_memberId,
                Members.m_accountId == m_accountId
            )
        )).first()
        if not result:
            raise HTTPException(status_code=404, detail=f"Member Not Found")
        member, proxy = result
        codexName = proxy.p_codexName
        extMember = member.m_memberExtensionNo
        await session.delete(member)
        await session.commit()
        
        async_engineO = get_async_engineO(codexName)
        asyncO_session_maker = sessionmaker(async_engineO, expire_on_commit=False, class_=AsyncSession)
        sessionO = asyncO_session_maker()
        
        await sessionO.execute(text("""DELETE FROM subscriber WHERE username = :username AND domain = :domain"""),{"username": extMember, "domain": "13.201.218.156"})
        await sessionO.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Member Deleted Successfully"}
        )
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await sessionO.close()
        await async_engine.dispose()
        await async_engineO.dispose()

# Get a CLI
async def getMember(accountEncryption: str, m_accountNo: str, m_memberRole: str, limit: int, offset: int, searchString: str, sortField: str,sortOrder: str, roleFilter: str, memberMode: str, memberPlatform: str, type: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        # Base query
        base_query = select(Members)
        filters = []
        # Apply search filter
        if searchString:
            search_conditions  = or_(
                Members.m_accountNo.ilike(f"%{searchString}%"),
                Members.m_accountCode.ilike(f"%{searchString}%"),
                Members.m_memberName.ilike(f"%{searchString}%"),
                Members.m_memberRole.ilike(f"%{searchString}%"),
                Members.m_memberExtensionNo.ilike(f"%{searchString}%"),
                Members.m_memberCallerId.ilike(f"%{searchString}%"),
                Members.m_memberMobileNo.ilike(f"%{searchString}%"),
                Members.m_memberMailId.ilike(f"%{searchString}%"),
                Members.m_memberMode.ilike(f"%{searchString}%"),
                Members.m_memberPlatformType.ilike(f"%{searchString}%"),
            )
            filters.append(search_conditions)
            
        if roleFilter:
            filters.append(Members.m_memberRole == roleFilter)
            
        if memberMode:
            filters.append(Members.m_memberMode == memberMode)
            
        if memberPlatform:
            filters.append(Members.m_memberPlatformType == memberPlatform)
        
        if m_memberRole != "SUPERADMIN":
            filters.append(Members.m_accountNo == m_accountNo)

        if filters:
            base_query = base_query.where(and_(*filters))
            
        # Sorting
        if sortField and sortOrder:
            order_clause = getattr(getattr(Members, sortField), sortOrder.lower())()
            base_query = base_query.order_by(order_clause)
        
        # ------------------------------
        # EXPORT MODE
        # ------------------------------
        if type == "export":
            csv_headers = [
                "Member ID", "Account No", "Account Code", "Member Name",
                "Member Role", "Extension No", "Caller ID Mode", "Caller ID",
                "Mobile No", "Mail ID", "Mode", "Platform Type",
                "Campaign ID", "Created On", "Updated On"
            ]

            print("Preparing Member export CSV...")

            # Format row data
            def format_member_row(member, serial_no):
                return [
                    serial_no,
                    member.m_memberId,
                    member.m_accountNo,
                    member.m_accountCode,
                    member.m_memberName,
                    member.m_memberRole,
                    member.m_memberExtensionNo,
                    member.m_memberCallerIdMode,
                    member.m_memberCallerId,
                    member.m_memberMobileNo,
                    member.m_memberMailId,
                    member.m_memberMode,
                    member.m_memberPlatformType,
                    member.m_campaignId,
                    member.m_createdOn,
                    member.m_updatedOn,
                ]

            # Get all members for export
            result = await session.execute(base_query)
            members = result.scalars().all()

            current_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"member_export_{m_accountNo}_{current_time}.csv"

            print(f"Exporting Members with filename: {filename}")

            # Call your CSV export utility
            return await cdrexport(
                session=session,
                query_or_list=members,
                filename=filename,
                csv_headers=csv_headers,
                row_formatter=format_member_row
            )
        # Count total filtered
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar()
        
        # Apply pagination
        paginated_query = base_query.offset(offset).limit(limit)
        result = await session.execute(paginated_query)
        memberl = result.scalars().all()

        # Serialize
        Memberlist_serializable = [
            dto.Memberlist.from_orm(member).model_dump(mode="json") for member in memberl
        ]

        response_payload = {
            "recordsTotal": recordsTotal,
            "data": Memberlist_serializable
        }

        return response_payload

    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()

async def updateclicktocall(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int, m_clicktocallType: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        allowed_types = ["SYSTEM", "MOBILE",]
        if m_clicktocallType is not None and m_clicktocallType not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid click-to-call type. Allowed types: 'SYSTEM', 'MOBILE'"
            )
        
        # Check if member exists
        query = select(Members).where(
            Members.m_accountId == m_accountId,
            Members.m_accountNo == m_accountNo,
            Members.m_memberId == m_memberId
        )
        result = await session.execute(query)
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=404,
                detail="Member not found for given account and member ID"
            )

        # Update click-to-call type
        stmt = (
            Update(Members)
            .where(
                Members.m_accountId == m_accountId,
                Members.m_accountNo == m_accountNo,
                Members.m_memberId == m_memberId
            )
            .values(
                m_clicktocallType=m_clicktocallType
            )
        )

        await session.execute(stmt)
        await session.commit()

        return {
            "status": "success",
            "message": f"Click-to-call type updated to '{m_clicktocallType}'"
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()

async def update2FAStatus(accountid: int, accountno: str, memberid: int, member2fastatus: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordquery = (Update(Members).where(
                Members.m_accountId == accountid,
                Members.m_accountNo == accountno,
                Members.m_memberId == memberid
            ).values(m_member2FAStatus=member2fastatus)
        )
        await session.execute(recordquery)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()