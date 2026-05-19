from db.context import  get_async_engine, get_redis_client_by_db
from sqlalchemy import Delete
from sqlalchemy import Update, select,func
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import Leads, PConversationStatus, PTask, get_database
from fastapi import HTTPException
from sqlalchemy.exc import  SQLAlchemyError
import json
from fastapi import  status
from fastapi.responses import JSONResponse
from typing import Optional
from fastapi import status
import random
import colorsys
from datetime import datetime

async def getdetails(accountEncryption: str, c_accountId: int, c_accountNo: str, c_phonenumber: str):
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        stmt = select(Leads).where(
            Leads.l_accountId == c_accountId,
            Leads.l_accountNo == c_accountNo,
            Leads.l_leadMobileNumber == c_phonenumber
        )
        print(c_accountId)
        print(c_accountNo)
        print(c_phonenumber)
        result = await session.execute(stmt)
        lead = result.scalar_one_or_none()
        return lead
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()

def get_random_hex_color():
    h = random.random()
    s = (60 + random.random() * 20) / 100
    l = (75 + random.random() * 15) / 100
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return '#{:02x}{:02x}{:02x}'.format(int(r * 255), int(g * 255), int(b * 255))
    

async def getconversationlist(accountEncryption: str, c_accountId: int, c_accountNo: str, m_memberExtensionNo: str):
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
    
        stmt = (
        select(        
            PConversationStatus.c_memberExtensionNo,
            PConversationStatus.c_callId,
            Leads.l_leadId,
            Leads.l_leadName,
            Leads.l_leadMobileNumber
        )
        .join(PTask, PTask.t_callId == PConversationStatus.c_callId, isouter=True)
        .join(Leads, Leads.l_leadId == PTask.t_leadId, isouter=True)
        .where(PConversationStatus.c_memberExtensionNo == m_memberExtensionNo)
        )    
        result = await session.execute(stmt)
        rows = result.all()
        
        data = []
        for c_ext, c_call, l_id, l_name, l_leadMobileNumber in rows:
            data.append({
                "memberExtension": c_ext,
                "callId": c_call,
                "leadId": l_id,
                "leadName": l_name,
                "mobileNO":l_leadMobileNumber,
                "colour": get_random_hex_color(),
                "status": "Call Ended"
            })
        return {"data": data}
        
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()
        



async def conversationFetch(leadId: str, accountId: int, accountNo: str, database: str) -> JSONResponse:
    client = None
    try:
        client, db = get_database('onedb')
        collection = db['activities']

        cursor = collection.find({
            'leadId': leadId,
            'accountId': accountId,
            'accountNumber': accountNo
        }).sort("timestamp",1)

        results = []
        async for doc in cursor:
            doc['_id'] = str(doc['_id'])
            if isinstance(doc.get('timestamp'), datetime):
                doc['timestamp'] = doc['timestamp'].isoformat()
            results.append(doc)

        if not results:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"message": "No conversations found"},
            )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Conversations fetched successfully.",
                "data": results,
            },
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"},
        )
    finally:
        if client:
            client.close()  # ✅ Properly closes the MongoDB connection        