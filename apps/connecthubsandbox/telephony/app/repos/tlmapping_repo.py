from models.db import Members, Accounts
from typing import List
from db.context import asyncSessionFactory
from sqlalchemy import text, select, or_, func, delete, and_
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from models.dto import Tllist, TlmappingRequest, MembersModel, tlfetchRequest
from models.db import Teams
from sqlalchemy.exc import IntegrityError

async def gettl(request: tlfetchRequest, accountId: int, accountNo: str, database: str) -> dict:
    sessionmaker = asyncSessionFactory(database)

    async with sessionmaker() as session:
        try:
            # Build Base Query
            tl_query = (
                select(Members)
                .where(
                    Members.m_accountId == accountId,
                    Members.m_accountNo == accountNo,
                    Members.m_memberRole == 'TL'
                )
            )

            # 🔍 Search: works on name and extension
            if request.searchString:
                search_term = f"%{request.searchString}%"
                tl_query = tl_query.where(
                    or_(
                        Members.m_memberName.ilike(search_term),
                        Members.m_memberExtensionNo.ilike(search_term)
                    )
                )

            # ⬅ Sorting: Dynamic sort based on user input
            order_column = getattr(Members, request.sortField)
            if request.sortOrder == "DESC":
                tl_query = tl_query.order_by(order_column.desc())
            else:
                tl_query = tl_query.order_by(order_column.asc())

            # 📌 Pagination
            tl_query = tl_query.offset(request.offset).limit(request.limit)

            # ✅ Execute Query
            result = (await session.execute(tl_query)).scalars().all()
            tls = [Tllist.model_validate(member).model_dump() for member in result]

            # 🔁 Fetch Team Members for each TL
            for tl in tls:
                member_query = await session.execute(
                    select(Members)
                    .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                    .where(
                        Teams.t_teamLeaderId == tl['m_memberId'],
                        Teams.t_accountId == accountId,
                        Teams.t_accountNo == accountNo
                    )
                )
                members = member_query.scalars().all()
                tl["members"] = [
                    {
                        "m_memberId": m.m_memberId,
                        "m_memberName": m.m_memberName,
                        "m_memberExtensionNo": m.m_memberExtensionNo
                    }
                    for m in members
                ]

            count_query = (
                select(func.count())
                .select_from(Members)
                .where(
                    Members.m_accountId == accountId,
                    Members.m_accountNo == accountNo,
                    Members.m_memberRole == 'TL'
                )
            )

            if request.searchString:
                search_term = f"%{request.searchString}%"
                count_query = count_query.where(
                    or_(
                        Members.m_memberName.ilike(search_term),
                        Members.m_memberExtensionNo.ilike(search_term)
                    )
                )

            recordsTotal = (await session.execute(count_query)).scalar() or 0

            return {
                "recordsTotal": recordsTotal,
                "data": tls
            }

        except SQLAlchemyError as db_err:
            await session.rollback()
            raise HTTPException(status_code=500, detail="Database query failed") from db_err

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e


async def createtlmap(request: TlmappingRequest, accountId: int, accountNo: str, database: str) -> dict:
    sessionmaker = asyncSessionFactory(database)

    async with sessionmaker() as session:
        try:
            # Fetch TL Member
            tlmember = await session.get(Members, request.tlmemberid)
            if not tlmember:
                raise HTTPException(status_code=404, detail="TL Member not found")

            tl_ext_no = tlmember.m_memberExtensionNo  # TL extension

            # Validate member IDs
            result = await session.execute(
                select(Members.m_memberId)
                .where(
                    and_(
                        Members.m_memberId.in_(request.memberids),
                        Members.m_accountId == accountId,
                        Members.m_accountNo == accountNo,
                    )
                )
            )

            valid_members = {row[0] for row in result}
            missingMembers = set(request.memberids) - valid_members
            if missingMembers:
                raise HTTPException(status_code=400, detail="Invalid members")

            # Delete old mapping
            await session.execute(delete(Teams).where(Teams.t_teamLeaderId == request.tlmemberid))

            for memberid in request.memberids:
                member = await session.get(Members, memberid)
                member_ext_no = member.m_memberExtensionNo

                session.add(
                    Teams(
                        t_teamLeaderId=request.tlmemberid,
                        t_teamMemberId=memberid,
                        t_teamLeaderExtensionNo=tl_ext_no,
                        t_teamMemberExtensionNo=member_ext_no,
                        t_accountId=accountId,
                        t_accountNo=accountNo,
                    )
                )

            await session.commit()
            return {"message": "TL mapping created successfully"}

        except SQLAlchemyError as db_err:
            await session.rollback()
            raise HTTPException(status_code=500, detail="Database insert failed") from db_err

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e)) from e

async def listMembers(accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            recordQuery = select(Members).where(
                Members.m_accountId == accountid,
                Members.m_accountNo == accountno,
                Members.m_memberRole == "USER"
            )
            result = await session.execute(recordQuery)
            totalRecordsUnserialized = result.scalars().all()
            totalRecords = [MembersModel.from_orm(record).dict() for record in totalRecordsUnserialized]
            return totalRecords
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")