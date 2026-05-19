from fastapi import HTTPException
from pymongo.errors import PyMongoError
from db.context import asyncClientFactory, get_async_engine
from collections import defaultdict
from datetime import datetime
from bson import ObjectId
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from models.db import Contact

def convert_objectids(obj):
    """Recursively convert all ObjectId instances to strings."""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectids(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids(item) for item in obj]
    return obj

async def get_contact_name_by_phone(phone_number: str, accountid: int, accountno: str, database: str):
    """Look up contact name from p_contacts table by phone number."""
    if not phone_number:
        return None
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        # Get the last 10 digits of the phone number for matching
        phone_suffix = phone_number[-10:] if len(phone_number) >= 10 else phone_number
        
        # Query using LIKE to match phone numbers ending with the same digits
        query = select(Contact.c_Name).where(
            Contact.c_accountId == str(accountid),
            Contact.c_accountNo == accountno,
            Contact.c_phoneNumber.like(f'%{phone_suffix}')
        )
        result = await session.execute(query)
        contact_name = result.scalar_one_or_none()
        return contact_name
    except Exception as e:
        print(f"Error looking up contact: {e}")
        return None
    finally:
        await session.close()
        await async_engine.dispose()

async def history(leadid: str, plandetails: dict, membername: str, accountid: int, accountno: str, database: str, limit: int = 20, offset: int = 0):
    client, db = asyncClientFactory(database)
    try:
        collection = db['activities']
        chat_history = (plandetails.get("options", {}).get("conversation", {}).get("chat_history", "public"))
        query = {
            "leadId": leadid,
            "accountId": accountid,
            "accountNo": accountno,
        }
        if chat_history == "private":
            query["memberName"] = membername
            
        # Get count for debugging or total pages if needed later
        # count = await collection.count_documents(query) 
        
        # Sort descending to get latest messages first
        cursor = collection.find(query).sort("activityTimestamp", -1).skip(offset).limit(limit)
        
        grouped_results = defaultdict(list)
        
        # Cache for contact names to avoid repeated queries
        contact_name_cache = {}
        
        # Collect all docs first to reverse them back to chronological order (oldest to newest)
        docs = []
        async for doc in cursor:
             docs.append(doc)
             
        # Reverse to have oldest message first in the batch
        docs.reverse()

        for doc in docs:
            doc = convert_objectids(doc)
            timestamp = doc.get('activityTimestamp')
            
            if not timestamp:
                continue
            
            # For inbound messages, look up contact name
            if doc.get('direction') == 'Inbound' and doc.get('channel') == 'Whatsapp':
                phone_number = doc.get('details', {}).get('m_src')
                if phone_number:
                    if phone_number not in contact_name_cache:
                        contact_name_cache[phone_number] = await get_contact_name_by_phone(
                            phone_number, accountid, accountno, database
                        )
                    if contact_name_cache[phone_number]:
                        doc['senderName'] = contact_name_cache[phone_number]

            if isinstance(timestamp, datetime):
                date_key = timestamp.strftime('%Y-%m-%d')
                doc['activityTimestamp'] = timestamp.isoformat()
            else:
                try:
                    date_key = str(timestamp)[:10]
                except Exception:
                    continue
            grouped_results[date_key].append(doc)
        # Check if grouped_results is empty is removed or handled by frontend receiving empty dict/list
        # if not grouped_results:
        #    raise HTTPException(status_code=200, detail=f'Conversation History Not Found')
        return dict(grouped_results)
    except HTTPException:
        raise
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        client.close()



async def historyName(plandetails: dict, membername: str, accountid: int, accountno: str, database: str, limit: int = 20, offset: int = 0):
    client, db = asyncClientFactory(database)
    try:
        collection = db['activities']
        query = {
            "memberName": membername,
            "accountId": accountid,
            "accountNo": accountno,
        }

            
        # Get count for debugging or total pages if needed later
        # count = await collection.count_documents(query) 
        
        # Sort descending to get latest messages first
        cursor = collection.find(query).sort("activityTimestamp", -1).skip(offset).limit(limit)
        
        grouped_results = defaultdict(list)
        
        # Cache for contact names to avoid repeated queries
        contact_name_cache = {}
        
        # Collect all docs first to reverse them back to chronological order (oldest to newest)
        docs = []
        async for doc in cursor:
             docs.append(doc)
             
        # Reverse to have oldest message first in the batch
        docs.reverse()

        for doc in docs:
            doc = convert_objectids(doc)
            timestamp = doc.get('activityTimestamp')
            
            if not timestamp:
                continue
            
            # For inbound messages, look up contact name
            if doc.get('direction') == 'Inbound' and doc.get('channel') == 'Whatsapp':
                phone_number = doc.get('details', {}).get('m_src')
                if phone_number:
                    if phone_number not in contact_name_cache:
                        contact_name_cache[phone_number] = await get_contact_name_by_phone(
                            phone_number, accountid, accountno, database
                        )
                    if contact_name_cache[phone_number]:
                        doc['senderName'] = contact_name_cache[phone_number]

            if isinstance(timestamp, datetime):
                date_key = timestamp.strftime('%Y-%m-%d')
                doc['activityTimestamp'] = timestamp.isoformat()
            else:
                try:
                    date_key = str(timestamp)[:10]
                except Exception:
                    continue
            grouped_results[date_key].append(doc)
        # Check if grouped_results is empty is removed or handled by frontend receiving empty dict/list
        # if not grouped_results:
        #    raise HTTPException(status_code=200, detail=f'Conversation History Not Found')
        return dict(grouped_results)
    except HTTPException:
        raise
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        client.close()
