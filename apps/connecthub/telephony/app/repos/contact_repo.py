from sqlalchemy import Delete, Integer
from sqlalchemy import Update, select, func, case, or_, and_
from sqlalchemy.sql import over
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pymongo.errors import PyMongoError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from db.context import  get_async_engine, get_redis_client_by_db, asyncClientFactory, asyncSessionFactory
from models.db import Contact, Leads, Members
from models.dto import  Contactlist
from utils.sha256_hashing import generate_lead_id
from typing import Optional
from collections import defaultdict
from datetime import datetime

async def create(c_Name: str, c_phoneNumber: str, c_countryCode:str, c_mailId: str, c_organizationName: int, c_address: str, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, redis_key: str, c_accountNo: str, m_memberId:int):
    sessionmaker = asyncSessionFactory('onedb')
    async with sessionmaker() as session:
        try:
            Contactno = Contact()
            Contactno.c_Name = c_Name
            Contactno.c_countryCode = c_countryCode
            Contactno.c_phoneNumber = c_phoneNumber
            Contactno.c_mailId = c_mailId
            Contactno.c_organizationName = c_organizationName
            Contactno.c_address = c_address
            Contactno.c_phLogin = m_memberExtensionNo
            Contactno.c_accountId = m_accountId
            Contactno.c_accountNo = c_accountNo
            session.add(Contactno)
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

# Validate a contact
async def validator(vtype: str, vvalue: str, m_memberExtensionNo: str, accountEncryption: str, redis_key: str, m_accountId: int, c_accountNo: str,c_id: Optional[int] = None):
    if vtype == "phoneNumber":
        conditions = [
            Contact.c_phoneNumber == vvalue,
            Contact.c_phLogin == m_memberExtensionNo,
            Contact.c_accountNo == c_accountNo
        ]
        if c_id:
            conditions.append(Contact.c_id != c_id)    
        query = select(Contact).where(and_(*conditions))

        sessionmaker = asyncSessionFactory('onedb')
        async with sessionmaker() as session:
            try:
                result = await session.execute(query)
                contact = result.scalars().first()
                if contact:
                    print(contact)
                    return JSONResponse(
                        status_code=status.HTTP_409_CONFLICT,
                        content={"message": "Phone number already exists"}
                    )
                else:
                    return JSONResponse(
                        status_code=status.HTTP_200_OK,
                        content={"message": "Phone number is valid"}
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
    elif vtype == "mailId":
        conditions = [
            Contact.c_mailId == vvalue,
            Contact.c_phLogin == m_memberExtensionNo,
            Contact.c_accountNo == c_accountNo
        ]
        if c_id:
            conditions.append(Contact.c_id != c_id)
        query = select(Contact).where(and_(*conditions))

        sessionmaker = asyncSessionFactory('onedb')
        async with sessionmaker() as session:
            try:
                result = await session.execute(query)
                contact = result.scalars().first()
                if contact:
                    return JSONResponse(
                        status_code=status.HTTP_409_CONFLICT,
                        content={"message": "Email ID already exists"}
                    )
                else:
                    return JSONResponse(
                        status_code=status.HTTP_200_OK,
                        content={"message": "Email ID is valid"}
                    )
            except IntegrityError as e:
                raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
            except SQLAlchemyError as e:
                raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
            
# Update a contact  
async def update(c_Name: str, c_countryCode:str, c_phoneNumber: str, c_mailId: str, c_organizationName: str, c_address: str, m_memberExtensionNo: str, c_Id: int, accountEncryption: str, m_accountId: int, redis_key: str):
    # redis_client = get_redis_client_by_db(db=m_accountId)
    # await redis_client.delete(redis_key)
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:
        result = await session.execute(select(Contact).where(and_(Contact.c_id == c_Id,Contact.c_phLogin == m_memberExtensionNo)))
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(status_code=404, detail=f"Contact with ID {c_Id} not found")
        
        contactLeadId = contact.c_leadId
        contact.c_Name = c_Name
        contact.c_countryCode = c_countryCode
        contact.c_phoneNumber = c_phoneNumber
        contact.c_mailId = c_mailId
        contact.c_organizationName = c_organizationName
        contact.c_address = c_address
        await session.commit()
        print(contactLeadId)
        # leadresult = await session.execute(select(Leads).where(Leads.l_leadId == contactLeadId))
        # leadup = leadresult.scalar_one_or_none()
        
        # if leadup is None:
        #     raise HTTPException(status_code=404, detail="Lead not found")
        
        # leadup.l_leadMobileNumber = c_phoneNumber
        # leadup.l_leadName = c_Name
        
        # await session.commit()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Updated Successfully"}
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
        await async_engine.dispose()
            
 # Delete a contact       
async def delete(c_Id: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, redis_key: str):
    # redis_client = get_redis_client_by_db(db=m_accountId)
    # await redis_client.delete(redis_key)
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:

        result = await session.execute(select(Contact).where(and_(Contact.c_id == c_Id), Contact.c_phLogin == m_memberExtensionNo))
        contact = result.scalar_one_or_none()

        if not contact:
            raise HTTPException(status_code=404, detail=f"Contact with ID {c_Id} not found")


        await session.delete(contact)
        await session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Deleted Successfully"}
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
        await async_engine.dispose()

async def getContact(sortOrder: str, sortField: str, sortString: str, searchString: str, offset: int, limit: int, m_memberExtensionNo: str, accountEncryption: str, redis_key: str, hash_field: str, m_accountId: int, draw: int = 1 ):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        agent_priority = case(
            (Contact.c_phLogin == m_memberExtensionNo, 1),
            else_=0
        )
        row_number = func.row_number().over(
            partition_by=Contact.c_phoneNumber,
            order_by=[
                agent_priority.desc(),
                Contact.c_createdOn.desc()
            ]
        ).label("rn")
        base_query = select(
            Contact,
            row_number
        ).where(
            Contact.c_accountId == m_accountId,
            Contact.c_phLogin != ''
        )
        if searchString:
            base_query = base_query.where(or_(
                Contact.c_Name.ilike(f"%{searchString}%"),
                Contact.c_phoneNumber.ilike(f"%{searchString}%"),
                Contact.c_mailId.ilike(f"%{searchString}%"),
                Contact.c_organizationName.ilike(f"%{searchString}%"),
                Contact.c_address.ilike(f"%{searchString}%")
            ))
        if sortString:
            base_query = base_query.where(
                Contact.c_Name.ilike(f"{sortString}%")
            )
        subq = base_query.subquery()
        count_query = select(func.count()).select_from(
            select(subq).where(subq.c.rn == 1).subquery()
        )
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar() or 0
        order_by_clause = Contact.c_createdOn.desc()
        if sortField and sortOrder:
            order_by_clause = getattr(
                getattr(Contact, sortField),
                sortOrder.lower()
            )()
        final_query = (
            select(Contact)
            .join(subq, subq.c.c_id == Contact.c_id)
            .where(subq.c.rn == 1)
            .order_by(order_by_clause)
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(final_query)
        contacts = result.scalars().all()
        contacts_serializable = [
            Contactlist.from_orm(contact).model_dump(mode="json")
            for contact in contacts
        ]
        return {
            "draw": draw,
            "recordsTotal": recordsTotal,
            "data": contacts_serializable
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

async def getContactlist(searchString: str, offset: int, limit: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, draw: int = 1 ):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        agent_priority = case(
            (Contact.c_phLogin == m_memberExtensionNo, 1),
            else_=0
        )
        row_number = func.row_number().over(
            partition_by=Contact.c_phoneNumber,
            order_by=[agent_priority.desc(), Contact.c_createdOn.desc()]
        ).label("rn")
        base_query = select(
            Contact,
            row_number
        ).where(Contact.c_phLogin != '', Contact.c_accountId == m_accountId)
        if searchString:
            base_query = base_query.where(
                or_(
                    Contact.c_Name.ilike(f"%{searchString}%"),
                    Contact.c_phoneNumber.ilike(f"%{searchString}%")
                )
            )
        subq = base_query.subquery()
        final_query = select(subq).where(subq.c.rn == 1)
        count_query = select(func.count()).select_from(final_query.subquery())
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar() or 0
        final_query = (
            select(Contact)
            .join(subq, subq.c.c_id == Contact.c_id)
            .where(subq.c.rn == 1)
            .order_by(Contact.c_createdOn.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(final_query)
        contacts = result.scalars().all()
        contacts_serializable = [
            Contactlist.from_orm(contact).model_dump(mode="json")
            for contact in contacts
        ]
        response_payload = {
            "draw": draw,
            "recordsTotal": recordsTotal,
            "data": contacts_serializable
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

async def history(phoneno: str, countrycode: str, accountid: int, accountno: str, database: str):
    client, db = asyncClientFactory(database)
    sessionmaker = asyncSessionFactory('onedb')
    async with sessionmaker() as session:
        try:
            recordQuery = (select(Leads.l_leadId).where(
                and_(
                    Leads.l_leadPhoneNo == f"{countrycode}{phoneno}",
                    Leads.l_accountId == accountid,
                    Leads.l_accountNo == accountno
                )
            ))
            leadid = (await session.execute(recordQuery)).scalar_one_or_none()
            collection = db['activities']
            cursor = collection.find({
                'leadId': leadid,
                'accountId': accountid,
                'accountNo': accountno
            }).sort("activityTimestamp", 1)
            grouped_results = defaultdict(list)
            async for doc in cursor:
                doc['_id'] = str(doc['_id'])
                if isinstance(doc.get('activityTimestamp'), datetime):
                    date_key = doc['activityTimestamp'].strftime('%Y-%m-%d')
                    doc['activityTimestamp'] = doc['activityTimestamp'].isoformat()
                else:
                    date_key = doc['activityTimestamp'][:10]
                grouped_results[date_key].append(doc)
            if not grouped_results:
                raise HTTPException(status_code=200, detail=f'Conversation History Not Found')
            return dict(grouped_results)
        except HTTPException:
            raise
        except PyMongoError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

        finally:
            pass


# ----------------- ADMIN REPO METHODS -----------------

async def admin_create(c_Name: str, c_phoneNumber: str, c_countryCode:str, c_mailId: str, c_organizationName: int, c_address: str, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, redis_key: str, c_accountNo: str, m_memberId:int):
    sessionmaker = asyncSessionFactory('onedb')
    async with sessionmaker() as session:
        try:
            Contactno = Contact()
            Contactno.c_Name = c_Name
            Contactno.c_countryCode = c_countryCode
            Contactno.c_phoneNumber = c_phoneNumber
            Contactno.c_mailId = c_mailId
            Contactno.c_organizationName = c_organizationName
            Contactno.c_address = c_address
            # For admin, we can still set the extension if available, or a special marker. User said Admin has extension.
            Contactno.c_phLogin = m_memberExtensionNo 
            Contactno.c_accountId = m_accountId
            Contactno.c_accountNo = c_accountNo
            session.add(Contactno)
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

async def admin_validator(vtype: str, vvalue: str, accountEncryption: str, m_accountId: int, c_accountNo: str, c_id: Optional[int] = None):
    # Admin validator checks for global uniqueness within the account, ignoring extension.
    if vtype == "phoneNumber":
        conditions = [
            Contact.c_phoneNumber == vvalue,
            Contact.c_accountId == m_accountId,
            # Contact.c_accountNo == c_accountNo # Assuming accountId is enough, but accountNo key
        ]
        if c_id:
            conditions.append(Contact.c_id != c_id)    
        query = select(Contact).where(and_(*conditions))

        sessionmaker = asyncSessionFactory('onedb')
        async with sessionmaker() as session:
            try:
                result = await session.execute(query)
                contact = result.scalars().first()
                if contact:
                    return JSONResponse(
                        status_code=status.HTTP_409_CONFLICT,
                        content={"message": "Phone number already exists in this account"}
                    )
                else:
                    return JSONResponse(
                        status_code=status.HTTP_200_OK,
                        content={"message": "Phone number is valid"}
                    )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

async def admin_update(c_Name: str, c_countryCode:str, c_phoneNumber: str, c_mailId: str, c_organizationName: str, c_address: str, c_Id: int, accountEncryption: str, m_accountId: int, redis_key: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:
        # Admin can update ANY contact in the account
        result = await session.execute(select(Contact).where(and_(Contact.c_id == c_Id, Contact.c_accountId == m_accountId)))
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(status_code=404, detail=f"Contact with ID {c_Id} not found")
        
        contact.c_Name = c_Name
        contact.c_countryCode = c_countryCode
        contact.c_phoneNumber = c_phoneNumber
        contact.c_mailId = c_mailId
        contact.c_organizationName = c_organizationName
        contact.c_address = c_address
        await session.commit()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Updated Successfully"}
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await async_engine.dispose()

async def admin_delete(c_Id: int, accountEncryption: str, m_accountId: int, redis_key: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:
        # Admin can delete ANY contact in the account
        result = await session.execute(select(Contact).where(and_(Contact.c_id == c_Id, Contact.c_accountId == m_accountId)))
        contact = result.scalar_one_or_none()

        if not contact:
            raise HTTPException(status_code=404, detail=f"Contact with ID {c_Id} not found")

        await session.delete(contact)
        await session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Deleted Successfully"}
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await async_engine.dispose()

async def admin_getContact(sortOrder: str, sortField: str, sortString: str, searchString: str, offset: int, limit: int, accountEncryption: str, redis_key: str, hash_field: str, m_accountId: int, draw: int = 1 ):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        # Base query for ADMIN: Select ALL contacts for the account, ignore c_phLogin
        # Join with Members to get the creator's name
        base_query = select(Contact, Members.m_memberName).outerjoin(
            Members,
            func.cast(Contact.c_phLogin, Integer) == Members.m_memberExtensionNo
        ).where(Contact.c_accountId == m_accountId)

        # Apply search filter (updated to include Contact fields only or clarify ambiguity)
        if searchString:
            base_query = base_query.where(or_(
                Contact.c_Name.ilike(f"%{searchString}%"),
                Contact.c_phoneNumber.ilike(f"%{searchString}%"),
                Contact.c_mailId.ilike(f"%{searchString}%"),
                Contact.c_organizationName.ilike(f"%{searchString}%"),
                Contact.c_address.ilike(f"%{searchString}%")
            ))

        if sortString:
            base_query = base_query.where(Contact.c_Name.ilike(f"{sortString}%"))

        # Sorting
        if sortField and sortOrder:
            # Handle sorting by creator name if needed, otherwise default to Contact fields
            if sortField == 'c_createdByName':
                 order_clause = getattr(getattr(Members, 'm_memberName'), sortOrder.lower())()
            else:
                order_clause = getattr(getattr(Contact, sortField), sortOrder.lower())()
            base_query = base_query.order_by(order_clause)

        #total count
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar()
        
        # Apply pagination
        paginated_query = base_query.offset(offset).limit(limit)
        result = await session.execute(paginated_query)
        rows = result.all() # Limit results in (Contact, member_name) tuples

        # Serialize
        contacts_serializable = []
        for contact, member_name in rows:
            contact_dict = Contactlist.from_orm(contact).model_dump(mode="json")
            contact_dict['c_createdByName'] = member_name if member_name else "Unknown"
            contacts_serializable.append(contact_dict)

        response_payload = {
            "draw": draw,
            "recordsTotal": recordsTotal,
            "data": contacts_serializable
        }

        return response_payload
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await async_engine.dispose()