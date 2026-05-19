from db.context import get_sync_session_maker,get_async_session_maker
from sqlalchemy import Delete, Update,select,and_
from sqlalchemy.orm import joinedload
from models.db import  CLINumbers,DidNumberGroup,RelationalDidnumbersGroups
from typing import Optional,List
from fastapi.responses import JSONResponse
from fastapi import status
from sqlalchemy.exc import IntegrityError
from collections import defaultdict
from sqlalchemy import text
from fastapi import Request
import hashlib

def createProcess(didGroupName: str,cliId: List[int],regId: int,accountNo: str,database: str) -> JSONResponse:
    sync_session_maker = get_sync_session_maker(database)

    session = sync_session_maker()  # manually create session
    try:

        didGroup = DidNumberGroup(
            d_accountId=regId,
            d_accountNo=accountNo,
            d_didnumbergroupName=didGroupName,  # ✅ fixed here
            d_didnumbergroupStatus=1,
        )
        session.add(didGroup)
        session.commit()
        didGroupId = didGroup.d_didnumbergroupId
        
        result = session.execute(select(CLINumbers))
        cliNumbers = result.scalars().all()
        for cliNumber in cliNumbers:
            
            if cliNumber.c_clinumberId in cliId:
                insertRelationValues = RelationalDidnumbersGroups(
                    r_accountId=regId,
                    r_accountNo=accountNo,
                    r_didnumbergroupId=didGroupId,
                    r_didnumberId=cliNumber.c_clinumberId,

                )
                session.add(insertRelationValues)
                session.commit()
                
                

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Did Number Groups have been created successfully.",
                # "message": cliNumber.c_clinumberId,
                "data": 'success',
            },
        )
    except Exception as e:
        session.rollback()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"},
        )
    finally:
        session.close()  # always close in finally block      

        
        
def updateProcess(didnumberGroupId:int,didGroupName: str,cliId: List[int],activeStatus: int,regId: int,accountNo: str,database: str) -> JSONResponse:
    sync_session_maker = get_sync_session_maker(database)
    session = sync_session_maker()  # manually create session

    try:
        

        # Delete existing DidNumberGroup entries for this group ID
        result = session.execute(
            Delete(RelationalDidnumbersGroups).where(
                and_(
                    RelationalDidnumbersGroups.r_didnumbergroupId == didnumberGroupId,
                    RelationalDidnumbersGroups.r_accountId == regId,
                    RelationalDidnumbersGroups.r_accountNo == accountNo
                )
            )
        )

        if result.rowcount == 0:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"message": f"DidNumberGroup with ID {didnumberGroupId} not found."},
            )
        
        result = session.execute(
            Update(DidNumberGroup)
            .where(
                and_(
                    DidNumberGroup.d_didnumbergroupId == didnumberGroupId,
                    DidNumberGroup.d_accountId == regId,
                    DidNumberGroup.d_accountNo == accountNo
                )
            )
            .values(
                d_didnumbergroupName=didGroupName,
                d_didnumbergroupStatus=activeStatus
            )
        )    
        result = session.execute(select(CLINumbers))
        cliNumbers = result.scalars().all()
        for cliNumber in cliNumbers:
            
            if cliNumber.c_clinumberId in cliId:
                insertRelationValues = RelationalDidnumbersGroups(
                    r_accountId=regId,
                    r_accountNo=accountNo,
                    r_didnumbergroupId=didnumberGroupId,
                    r_didnumberId=cliNumber.c_clinumberId,

                )
                session.add(insertRelationValues)  


        session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Did Number Groups have been updated successfully.",
                "response": "success"
            }
        )

    except Exception as e:
        session.rollback()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"},
        )
    finally:
        session.close()  # always close in finally block          
            
        


def deleteProcess(didnumberGroupId:int,regId: int,accountNo: str,database: str) -> JSONResponse:
    sync_session_maker = get_sync_session_maker(database)

    session = sync_session_maker()  # manually create session

    try:
        # Delete existing DidNumberGroup entries for this group ID
        result = session.execute(
            Delete(DidNumberGroup).where(
                and_(
                    DidNumberGroup.d_didnumbergroupId == didnumberGroupId,
                    DidNumberGroup.d_accountId == regId,
                    DidNumberGroup.d_accountNo == accountNo
                )
            )
        )
        

        if result.rowcount == 0:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"message": f"DidNumberGroup with ID {didnumberGroupId} not found."},
            )
        session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Did Number Groups have been deleted successfully.",
                "response": "success"
            }
        )
    except Exception as e:
        session.rollback()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"An unexpected error occurred: {str(e)}"},
        )
    finally:
        session.close()  # always close in finally block  


def CliFetchProcess(regId: int, accountNo: str, database: str) -> JSONResponse:
    sync_session_maker = get_sync_session_maker(database)
    session = sync_session_maker()

    try:
        # Filter CLINumbers without associated RelationalDidnumbersGroups
        unmapped_clis = session.query(CLINumbers).filter(
            CLINumbers.c_accountId == regId,
            CLINumbers.c_accountNo == accountNo,
            CLINumbers.MembersRelationship == None  # <- This checks if NOT in relational table
        ).all()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={               
                "data": [
                    {
                        "clinumberId": cli.c_clinumberId,
                        "clinumberName": cli.c_clinumberName
                    }
                    for cli in unmapped_clis
                ]
            }
        )

    except Exception as e:
        session.rollback()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"Error: {str(e)}"},
        )
    finally:
        session.close()          
        
        
        
def fetchProcessData(regId: int, accountNo: str, database: str, request: Request) -> JSONResponse:
    # Extract DataTables query params
    query_params = request.query_params
    draw = int(query_params.get("draw", 1))
    start = int(query_params.get("start", 0))
    length = int(query_params.get("length", 10))

    sync_session_maker = get_sync_session_maker(database)
    session = sync_session_maker()

    try:
        sql = text("""
            SELECT 
                dg.d_didnumbergroupName AS group_name,
                dg.d_didnumbergroupStatus AS status,
                dg.d_didnumbergroupId AS group_id,
                cn.c_clinumberName AS cli_number
            FROM p_didnumbergroups dg
            LEFT JOIN p_relationaltable_didnumbers_didnumbergroups r
                ON dg.d_didnumbergroupId = r.r_didnumbergroupId
            LEFT JOIN p_clinumbers cn 
                ON cn.c_clinumberId = r.r_didnumberId
            WHERE dg.d_accountId = :regId AND dg.d_accountNo = :accountNo
        """)

        result = session.execute(sql, {"regId": regId, "accountNo": accountNo})
        rows = result.mappings().all()

        # Group by group_name
        grouped = defaultdict(lambda: {"group_id": None, "status": None, "cli_numbers": []})
        for row in rows:
            group_name = row["group_name"]
            grouped[group_name]["group_id"] = row["group_id"]
            grouped[group_name]["status"] = row["status"]
            if row["cli_number"]:
                grouped[group_name]["cli_numbers"].append(row["cli_number"])

        # Convert to list
        grouped_list = [
            {
                "group_name": name,
                "group_id": data["group_id"],
                "status": data["status"],
                "cli_numbers": data["cli_numbers"]
            }
            for name, data in grouped.items()
        ]

        total = len(grouped_list)
        paginated = grouped_list[start:start + length]

        return JSONResponse({
            "draw": draw,
            "recordsTotal": total,
            "recordsFiltered": total,
            "data": paginated
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        session.close()
