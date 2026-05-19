from db.context import  get_async_engine, get_redis_client_by_db
from sqlalchemy import Delete
from sqlalchemy import Update, select,func
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import CLINumbers, Leads, PTask
from fastapi import HTTPException
from sqlalchemy.exc import  SQLAlchemyError
import json
from fastapi import  status
from fastapi.responses import JSONResponse
from typing import Optional
from utils.sha256_hashing import generate_lead_id

async def create(l_serviceNo: str, l_leadMobileNumber: str, l_uniqueId: str, l_tasktype: str):
    async_engine = get_async_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        # Fetch ClI Details to get the customer details
        stmtcli = select(CLINumbers).where(CLINumbers.c_clinumberName == l_serviceNo)
        resultcli = await session.execute(stmtcli)
        cli = resultcli.scalar_one_or_none()
        
        if not cli:
            return {"status": "Failed", "Message" : "Service Number Not Found"} 
        
        c_accountNo = cli.c_accountNo
        c_accountId = cli.c_accountId
        
        # Check the lead is already avaliable
        stmtLead = select(Leads).where(and_(Leads.l_leadMobileNumber == l_leadMobileNumber, Leads.l_accountId == c_accountId, Leads.l_accountNo == c_accountNo))
        resultLead = await session.execute(stmtLead)
        lead = resultLead.scalar_one_or_none()

        if lead:
            leadid = lead.l_leadId
            new_task_id = generate_lead_id()
            print("✅ Lead already exists:")
            task = PTask()
            task.t_taskId = '00T' + new_task_id
            task.t_accountId = c_accountId
            task.t_accountNo = c_accountNo
            task.t_leadId = leadid
            task.t_callId = l_uniqueId
            task.t_taskType = l_tasktype
            task.t_taskMobileNo = l_leadMobileNumber
            task.t_taskServiceNo = l_serviceNo
            session.add(task)
            await session.commit()
            
            return {"status": "Success", "Message" : "Task Created Successfully"}  

        else:
            new_lead_id = generate_lead_id()
            # Create Lead
            new_lead = Leads()
            new_lead.l_leadId = '00L' + new_lead_id
            new_lead.l_accountId = c_accountId
            new_lead.l_accountNo = c_accountNo
            new_lead.l_leadMobileNumber = l_leadMobileNumber
            new_lead.l_leadOrigin = {"type": "Dialplan"}
            session.add(new_lead)
            await session.commit()
            
            new_task_id = generate_lead_id()
            # Create Task
            task = PTask()
            task.t_leadId = '00L' + new_lead_id
            task.t_accountId = c_accountId
            task.t_accountNo = c_accountNo
            task.t_taskId = '00T' + new_task_id
            task.t_callId = l_uniqueId
            task.t_taskType = l_tasktype
            task.t_taskMobileNo = l_leadMobileNumber
            task.t_taskServiceNo = l_serviceNo
            session.add(task)
            await session.commit()

            return {"status": "Success", "Message" : "Lead and Task Created Successfully"} 
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()