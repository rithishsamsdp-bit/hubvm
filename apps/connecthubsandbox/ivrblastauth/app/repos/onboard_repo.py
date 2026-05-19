from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from db.context import get_sync_engine,createCustome_db
from services import onboard_Service
from typing import Optional
import json

def val_companyName(company_Name: str, database: str):
    engine = get_sync_engine(database)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    Session = session_maker()
    try:
        session = Session()
        result = session.execute(
            text("SELECT * FROM p__companies WHERE c_companyName = :name LIMIT 1"),
            {"name": company_Name}
        ).fetchone()
        if result:
            raise ValueError("The Company Name Already Exist")
    finally:
        Session.close()
        engine.dispose()

def val_companycode(comapny_Code: str, database: str):
    engine = get_sync_engine(database)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    Session = session_maker()
    try:
        session = Session()
        result = session.execute(
            text("SELECT * FROM p__companies WHERE c_companyCode = :code LIMIT 1"),
            {"code": comapny_Code}
        ).fetchone()
        if result:
            raise ValueError("The Company Code Already Exist")
    finally:
        Session.close()
        engine.dispose()

def val_maiilid(mail_Id: str, database: str):
    engine = get_sync_engine(database)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    Session = session_maker()
    try:
        session = Session()
        result = session.execute(
            text("SELECT * FROM p__companies WHERE c_emailId = :email LIMIT 1"),
            {"email": mail_Id}
        ).fetchone()
        if result:
            raise ValueError("The Mail ID Already Exist")
    finally:
        Session.close()
        engine.dispose()
    
def create_cust(cust_Detials: dict, database: str):
    
        company_Name = cust_Detials['company_Name']
        company_Strength = cust_Detials['company_Strength']
        comapny_Code = cust_Detials['comapny_Code']
        mobile_Number = cust_Detials['mobile_Number']
        mail_Id = cust_Detials['mail_Id']
        utility_Data = cust_Detials['utlityData']
        json_Utlity = json.dumps(utility_Data)
        engine = get_sync_engine(database)
        session_maker = sessionmaker(bind=engine, expire_on_commit=False)
        Session = session_maker()
        try:
            session = Session()
            insert_query = text("""
                INSERT INTO p__companies (c_companyName, c_companyCode, c_emailId,c_contactNo,c_numberOfUser,c_utilityData)
                VALUES (:company_name, :comapny_Code, :mail_Id, :mobile_Number, :company_Strength, :utility_Data)
            """)
            session.execute(insert_query, {
                "company_name": company_Name,
                "comapny_Code": comapny_Code,
                "mail_Id": mail_Id,
                "mobile_Number": mobile_Number,
                "company_Strength":company_Strength,
                "utility_Data":json_Utlity
            })
            session.commit()
            
            select_query = text("""
                SELECT c_regId FROM p__companies WHERE c_companyCode = :c_companyCode LIMIT 1
            """)
            result = session.execute(select_query, {"c_companyCode": comapny_Code}).fetchone()
            
            if result:
                companyid = result[0]
                encription = onboard_Service.encriptionencoder(companyid)
                update_query = text("""
                                    UPDATE p__companies
                                    SET c_encrpytionID = :c_encrpytionID
                                    WHERE c_regId = :company_Id
                                """)
                session.execute(update_query, {
                "c_encrpytionID": encription,
                "company_Id": companyid
                })
                session.commit()
                session.execute(text(f"CREATE DATABASE IF NOT EXISTS pulse{encription}"))
                session.commit()
                # Session = get_session_maker(f"pulse{encription}")
                engine = get_sync_engine(f"pulse{encription}")
                createCustome_db(engine)
                return JSONResponse(
                    status_code=status.HTTP_201_CREATED ,
                    content={
                        "message": f"Customer Created Successfully"
                    }
                )
                
            else:
                return JSONResponse(
                        status_code=status.WS_1001_GOING_AWAY ,
                        content={
                        "message": f"Something went Wrong"
                        }
                    )
        finally:
            Session.close()
            engine.dispose()        