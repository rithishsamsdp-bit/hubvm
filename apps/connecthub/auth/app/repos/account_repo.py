from sqlalchemy import text, select, distinct, or_, func, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm.attributes import flag_modified
from fastapi import HTTPException
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema
from db.context import asyncSessionFactory
from models.db import Accounts, Plans, ProxyInstances, RelationalProxyInstancesAccounts, Members, MemberPlans, Subscriber
from models.dto import AccountsModel
from services import account_service
from utils.argon2_hashing import HashLib
from utils.formating import validatePlanUpdate
from datetime import datetime
import uuid, random, string, hashlib, json

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

START_PREFIX = 7182537432

AccountServiceRegion_ProxyId = {
    "Domestic": 1,
    "International": 2,
    "International-mid": 3,
    "Domestic-mid": 4
}

async def validate(accountname: str, accountcode: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
################################################### Main Code Block ###################################################
            result = (
                await session.execute(
                    select(Accounts.a_accountName, Accounts.a_accountCode)
                    .where(or_(Accounts.a_accountName == accountname, Accounts.a_accountCode == accountcode)).limit(1)
                )).first()
            return result if result else None
################################################### Main Code Block ###################################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def create(request: dict, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            accountname = request.accountname
            accountcode = request.accountcode
            accountcontactno = request.accountcontactno
            accountmailid = request.accountmailid
            accountdomainname = request.accountdomainid
            salesrepname = request.salesrepname
            accountbusinesvertical = request.accountbusinessvertical
            accountserviceregion = request.accountserviceregion
            accountTimeZone = request.accountTimeZone
            planname = request.planname
            previousprefix = (await session.execute(
                select(func.max(Accounts.a_accountPrefix))
            )).scalar()
            if previousprefix is None:
                accountprefix = START_PREFIX
            else:
                accountprefix = int(previousprefix) + 1
            plandetails = (await session.execute(
                select(Plans.p_planDetails).where(Plans.p_planName == planname).limit(1)
            )).scalar_one_or_none()
            account = Accounts(
                a_salesRepName=salesrepname,
                a_accountNo = '',
                a_accountEncryption = '',
                a_accountCode=accountcode,
                a_accountName=accountname,
                a_accountDomainId=accountdomainname,
                a_accountMailId=accountmailid,
                a_accountContactNo=accountcontactno,
                a_accountBusinessVertical=accountbusinesvertical,
                a_accountServiceRegion=accountserviceregion,
                a_accountPrefix=accountprefix,
                a_accountTimeZone=accountTimeZone,
                a_planName=planname,
                a_planDetails=plandetails
            )
            session.add(account)
            await session.flush()
            account_update = (await session.execute(
                select(Accounts).where(Accounts.a_accountCode == accountcode)
            )).scalar_one()
            accountid = account_update.a_accountId
            accountno = str(accountid) + str(abs(hash(uuid.uuid4())))[:10]
            accountencryption = account_service.createAccountEncryption(accountid)
            proxyid = AccountServiceRegion_ProxyId.get(accountserviceregion)
            account_update.a_accountNo = accountno
            account_update.a_accountEncryption = accountencryption
            account = RelationalProxyInstancesAccounts(
                r_accountId = accountid,
                r_accountNo = accountno,
                r_proxyId = proxyid,
            )
            session.add(account)
            await session.commit()
            await createAdmin(accountid, accountno, accountname, accountcode, accountmailid, plandetails, proxyid, database)
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

async def createAdmin(accountid: int, accountno: str, accountname: str, accountcode: str, accountmailid: str, plandetails: dict, proxyid: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block #######################################
            membername = await generateAdminName(session, accountcode)
            memberpassword = f"Pulse@{accountcode}"
            memberpasswordhash = HashLib.hash(memberpassword)
            memberextensionno = f"{accountid}1000"
            member = Members()
            member.m_accountId = accountid
            member.m_accountNo = accountno
            member.m_accountCode = accountcode
            member.m_memberName = membername
            member.m_memberPassword = memberpassword
            member.m_memberPasswordHash = memberpasswordhash
            member.m_memberExtensionNo = memberextensionno
            member.m_memberRole = "ADMIN"
            member.m_memberCallerId = memberextensionno
            session.add(member)
            await session.flush()
            memberPlan = MemberPlans()
            memberPlan.m_memberplanDetails  = plandetails["roles"]["ADMIN"]
            memberPlan.m_memberId = member.m_memberId
            session.add(memberPlan)
            await session.commit()
            proxyinstance = (await session.execute(select(ProxyInstances).where(ProxyInstances.p_proxyId == proxyid).limit(1))).scalars().first()
            proxyipaddress = proxyinstance.p_proxyIPAddress
            proxycodexname = proxyinstance.p_codexName
            await createSubscriber(memberextensionno, proxyipaddress, proxycodexname, accountid)
            await sendMail(accountname, accountcode, accountmailid, membername, memberpassword, 'https://connecthub.pulsework360.com/login')
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

async def generateAdminName(session, accountcode: str):
    while True:
        suffix = ''.join(random.choices(string.digits, k=5))
        membername = f"ADMIN{suffix}_{accountcode}"
        exists = (await session.execute(
            select(Members.m_memberId).where(Members.m_memberName == membername)
        )).scalar_one_or_none()
        if exists is None:
            return membername
    
async def createSubscriber(memberextensionno: int, proxyipaddress: str, proxycodexname: str, accountid: int):
    sessionmaker = asyncSessionFactory(proxycodexname)
    async with sessionmaker() as session:
        try:
            subscriberpassword = f"Pulse@#{memberextensionno}"
            ha1 = hashlib.md5(f"{memberextensionno}:{proxyipaddress}:{subscriberpassword}".encode()).hexdigest()
            subscriber = Subscriber()
            subscriber.username = memberextensionno
            subscriber.domain = proxyipaddress
            subscriber.password = subscriberpassword
            subscriber.email_address = ""
            subscriber.ha1 = ha1
            subscriber.ha1_sha256 = ""
            subscriber.ha1_sha512t256 = ""
            subscriber.custId = str(accountid)
            subscriber.userType = "ADMIN"
            session.add(subscriber)
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

async def sendMail(accountname: str, accountcode: str, accountmailid: str, membername: str, memberpassword: str, loginlink: str):
    recipientname = accountmailid.split("@")[0]
    subject = "Welcome to Pulse – Your Admin Login Credentials"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color:#FAFAFA; padding:20px; margin:0;">
        <div style="max-width:600px; margin:auto; background:#FFFFFF; padding:30px; border-radius:12px; border:1px solid #ff5200; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <h2 style="color:#ff5200; text-align:center; margin-bottom:20px;">🎉 Welcome to Pulse</h2>
        
        <!-- Greeting -->
        <p style="font-size:16px; color:#333; line-height:1.6;">
            Hello <strong>{recipientname}</strong>,
        </p>
        <p style="font-size:15px; color:#333; line-height:1.6;">
            Thank you for creating your account <b>{accountname}</b> with Pulse.  
            Below are your admin login credentials:
        </p>

        <!-- Credentials Box -->
        <div style="background:#FAFAFA; padding:20px; border:1px solid #ff5200; border-radius:8px; margin:25px 0; font-size:15px; line-height:1.6; color:#333;">
            <p><b>Company Code:</b> {accountcode}</p>
            <p><b>Username:</b> {membername}</p>
            <p><b>Password:</b> {memberpassword}</p>
        </div>

        <!-- Button -->
        <div style="text-align:center; margin:25px 0;">
            <a href="{loginlink}" 
            style="background:#ff5200; color:#FFFFFF; padding:14px 28px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block; border:1px solid #ff5200;">
            🔑 Login to Your Account
            </a>
        </div>

        <!-- Support -->
        <p style="font-size:14px; color:#555; line-height:1.6;">
            If you have any questions or need support, feel free to reach us:
        </p>
        <ul style="font-size:14px; color:#555; line-height:1.8; padding-left:18px;">
            <li>📞 Phone: <a href="tel:+914440001800" style="color:#ff5200; text-decoration:none;">+91 44 4000 1800</a></li>
            <li>📧 Email: <a href="mailto:support@pulse.in" style="color:#ff5200; text-decoration:none;">support@pulse.in</a></li>
            <li>🌐 Website: <a href="https://pulse.in" style="color:#ff5200; text-decoration:none;">pulse.in</a></li>
        </ul>

        <!-- Footer -->
        <p style="font-size:13px; color:#888; margin-top:30px; text-align:center; line-height:1.5;">
            Please do not share your credentials with anyone.  
            <br>Regards,<br><b>Pulse Support Team</b>
        </p>
        </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject=subject,
        recipients=[accountmailid],
        body=body,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            recordQuery = select(Accounts)
            if searchString:
                recordQuery = recordQuery.where(
                    or_(
                        Accounts.a_accountName.ilike(f"%{searchString}%"),
                        Accounts.a_accountDomainId.ilike(f"%{searchString}%"),
                        Accounts.a_accountCode.ilike(f"%{searchString}%")
                    )
                )
            if sortField and sortOrder:
                recordQuery = recordQuery.order_by(getattr(getattr(Accounts, sortField), sortOrder.lower())())
            totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar_one()
            totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).scalars().all()
            totalRecords = [AccountsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
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


async def accountdetails(accountid: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
####################################### Main Code Block ###########################################################################
            stmt = (select(Accounts.a_accountId,Accounts.a_accountName,Accounts.a_planName,Accounts.a_planDetails,Accounts.a_accountTimeZone).where(Accounts.a_accountId == accountid))
            result = await session.execute(stmt)
            row = result.first()
            if row:
                return {
                    "accountId": row.a_accountId,
                    "accountName": row.a_accountName,
                    "planName": row.a_planName,
                    "planDetails": row.a_planDetails,
                    "accountTimeZone": row.a_accountTimeZone,
                }
            return None
################################################### Main Code Block ###############################################################
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def updateaccountdetails(accountid: int, planDetails: dict,accounttimezone: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            # --------------------------------------------------
            # Fetch account
            # --------------------------------------------------
            stmt = select(Accounts).where(Accounts.a_accountId == accountid)
            result = await session.execute(stmt)
            account = result.scalars().first()

            if not account:
                raise HTTPException(status_code=404, detail=f"Account {accountid} not found")

            # --------------------------------------------------
            # Load current plan
            # --------------------------------------------------
            current_plan = account.a_planDetails or {}
            if isinstance(current_plan, str):
                current_plan = json.loads(current_plan)

                
            # --------------------------------------------------
            # Validate plan update
            # --------------------------------------------------
            # validation_result = validatePlanUpdate(current_plan, planDetails)
            # errors_list = validation_result.get("data", {}).get("errors", [])
            # if errors_list:
            #     return {"errors": errors_list}

            # # --------------------------------------------------
            # # Deep merge helper
            # # --------------------------------------------------
            # def deep_merge(d1, d2, skip_keys=("limits.features",)):
            #     for k, v in d2.items():
            #         if any(k.startswith(skip) for skip in skip_keys):
            #             continue
            #         if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            #             deep_merge(d1[k], v, skip_keys)
            #         else:
            #             d1[k] = v
            #     return d1

            # # --------------------------------------------------
            # # Merge planDetails into account plan
            # # --------------------------------------------------
            # updated_plan = deep_merge(current_plan.copy(), planDetails)

            # if "limits" in planDetails and "features" in planDetails["limits"]:
            #     updated_plan.setdefault("limits", {}).setdefault("features", {}).update(
            #         planDetails["limits"]["features"]
            #     )

            # --------------------------------------------------
            # Save account plan
            # --------------------------------------------------
            if accounttimezone:
                     account.a_accountTimeZone = accounttimezone
            updated_plan = planDetails
            account.a_planDetails = updated_plan
            flag_modified(account, "a_planDetails")
            
            # ==================================================
            # 🔥 ROLE → MEMBER → MEMBERPLANS (ORM ONLY)
            # ==================================================
          
            plan_roles = updated_plan.get("roles", {})

            for role, role_plan in plan_roles.items():
                member_ids_subq = (
                    select(Members.m_memberId)
                    .where(
                        Members.m_accountId == accountid,
                        Members.m_memberRole == role
                    )
                )

                await session.execute(
                    update(MemberPlans)
                    .where(MemberPlans.m_memberId.in_(member_ids_subq))
                    .values(
                        m_memberplanDetails=role_plan,
                        m_updatedOn=datetime.utcnow()
                    )
                )

            # --------------------------------------------------
            # Commit transaction
            # --------------------------------------------------
            await session.commit()

            return {
                "message": "Account Details Updated Successfully",
                "accountId": account.a_accountId,
                "accountName": account.a_accountName,
                "planName": account.a_planName,
                "planDetails": account.a_planDetails,
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

async def fetchCompanyUsers(accountid: int, limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            # Base query for members table
            stmt = select(
                Members.m_memberId,
                Members.m_memberName,
                Members.m_accountCode,
                Members.m_memberPassword,
                Members.m_memberRole,
                Members.m_memberExtensionNo,
                Members.m_memberMobileNo,
                Members.m_memberMailId,
                Members.m_memberMode,
                Members.m_createdOn,
                Members.m_updatedOn
            ).where(Members.m_accountId == accountid)
            
            # Add search filter if provided
            if searchString:
                stmt = stmt.where(
                    or_(
                        Members.m_memberName.ilike(f"%{searchString}%"),
                        Members.m_memberMailId.ilike(f"%{searchString}%"),
                        Members.m_memberRole.ilike(f"%{searchString}%"),
                        Members.m_accountCode.ilike(f"%{searchString}%")
                    )
                )
            
            # Add sorting
            if sortField and sortOrder:
                stmt = stmt.order_by(getattr(getattr(Members, sortField), sortOrder.lower())())
            else:
                stmt = stmt.order_by(Members.m_createdOn.desc())
            
            # Get total count before pagination
            totalCountQuery = select(func.count()).select_from(stmt.subquery())
            totalCount = (await session.execute(totalCountQuery)).scalar_one()
            
            # Apply pagination
            stmt = stmt.offset(offset).limit(limit)
            
            result = await session.execute(stmt)
            rows = result.all()
            
            # Convert to list of dictionaries
            users = []
            for row in rows:
                users.append({
                    "m_memberId": row.m_memberId,
                    "m_memberName": row.m_memberName,
                    "m_accountCode": row.m_accountCode,
                    "m_memberPassword": row.m_memberPassword,
                    "m_memberRole": row.m_memberRole,
                    "m_memberExtensionNo": row.m_memberExtensionNo,
                    "m_memberMobileNo": row.m_memberMobileNo,
                    "m_memberMailId": row.m_memberMailId,
                    "m_memberMode": row.m_memberMode,
                    "m_createdOn": row.m_createdOn.isoformat() if row.m_createdOn else None,
                    "m_updatedOn": row.m_updatedOn.isoformat() if row.m_updatedOn else None,
                })
            
            return {
                "totalCount": totalCount,
                "users": users
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

async def validate_account_code(accountcode: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            result = (
                await session.execute(
                    select(Accounts.a_accountCode)
                    .where(Accounts.a_accountCode == accountcode)
                    .limit(1)
                )
            ).first()

            return result is not None  # True = exists

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def createIp(request: dict, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            from models.db import SuperAdminIp # local import to avoid circular dependency if any
            ip_entry = SuperAdminIp(
                s_accountId=request.accountId,
                s_ip=request.ip,
                s_label=request.label,
                s_type=request.type
            )
            session.add(ip_entry)
            await session.commit()
            return {"message": "IP added successfully", "id": ip_entry.s_id}
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def fetchIpList(request, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            from models.db import SuperAdminIp
            stmt = select(SuperAdminIp).where(SuperAdminIp.s_accountId == request.accountId)
            
            if request.searchString:
                search = f"%{request.searchString}%"
                stmt = stmt.where(or_(
                    SuperAdminIp.s_ip.ilike(search),
                    SuperAdminIp.s_label.ilike(search)
                ))
            
            if request.sortField and request.sortOrder:
                order_col = getattr(SuperAdminIp, request.sortField, SuperAdminIp.s_createdOn)
                if request.sortOrder.upper() == "DESC":
                    stmt = stmt.order_by(order_col.desc())
                else:
                    stmt = stmt.order_by(order_col)
            else:
                 stmt = stmt.order_by(SuperAdminIp.s_createdOn.desc())

            # Pagination
            total_count_stmt = select(func.count()).select_from(stmt.subquery())
            total_count = (await session.execute(total_count_stmt)).scalar()
            
            stmt = stmt.offset(request.offset).limit(request.limit)
            result = await session.execute(stmt)
            rows = result.scalars().all()
            
            return {
                "totalCount": total_count,
                "data": [
                    {
                        "id": row.s_id,
                        "ip": row.s_ip,
                        "label": row.s_label,
                        "type": row.s_type,
                        "createdAt": row.s_createdOn.isoformat() if row.s_createdOn else None
                    } for row in rows
                ]
            }
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def deleteIp(id: int, accountId: int, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            from models.db import SuperAdminIp
            stmt = select(SuperAdminIp).where(SuperAdminIp.s_id == id, SuperAdminIp.s_accountId == accountId)
            result = await session.execute(stmt)
            ip_entry = result.scalars().first()
            
            if not ip_entry:
                raise HTTPException(status_code=404, detail="IP not found")
            
            await session.delete(ip_entry)
            await session.commit()
            return {"message": "IP deleted successfully"}
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

