from models.db import Members, Accounts
from typing import List
from db.context import asyncSessionFactory
from sqlalchemy import select, update, delete, or_, func, and_, text
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from models.dto import Tllist, TlmappingRequest, MembersModel, tlfetchRequest
from models.db import Teams, Projects, ProjectGroups, Locations, LocationGroups
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

async def projectCreate(projectname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            duplicate = (await session.execute(
                select(Projects).filter(
                    Projects.p_projectName == projectname
                )
            )).scalars().first()
            if duplicate:
                raise HTTPException(status_code=400, detail=f"Duplication Error, '{projectname}' already exists.")
            Project = Projects(
                p_accountId = accountid,
                p_accountNo = accountno,
                p_projectName = projectname
            )
            session.add(Project)
            await session.flush()
            if memberids:
                await session.execute(
                    ProjectGroups.__table__.insert(),
                    [
                        {
                            "p_accountId": accountid,
                            "p_accountNo": accountno,
                            "p_projectId": Project.p_projectId,
                            "p_memberId": memberid
                        }
                        for memberid in memberids
                    ]
                )
            await session.commit()
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def locationCreate(locationname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            duplicate = (await session.execute(
                select(Locations).filter(
                    Locations.l_locationName == locationname
                )
            )).scalars().first()
            if duplicate:
                raise HTTPException(status_code=400, detail=f"Duplication Error, '{locationname}' already exists.")
            Location = Locations(
                l_accountId = accountid,
                l_accountNo = accountno,
                l_locationName = locationname
            )
            session.add(Location)
            await session.flush()
            if memberids:
                await session.execute(
                    LocationGroups.__table__.insert(),
                    [
                        {
                            "l_accountId": accountid,
                            "l_accountNo": accountno,
                            "l_locationId": Location.l_locationId,
                            "l_memberId": memberid
                        }
                        for memberid in memberids
                    ]
                )
            await session.commit()
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def locationUpdate(locationid: int, locationname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            duplicate = (await session.execute(
                select(Locations).filter(
                    Locations.l_locationName == locationname,
                    Locations.l_locationId != locationid
                )
            )).scalars().first()
            if duplicate:
                raise HTTPException(status_code=400, detail=f"Duplication Error, '{locationname}' already exists.")
            await session.execute(
                delete(LocationGroups).where(
                    LocationGroups.l_locationId == locationid,
                    LocationGroups.l_accountId == accountid,
                    LocationGroups.l_accountNo == accountno
                )
            )
            await session.execute(update(Locations).where(
                    Locations.l_accountId == accountid,
                    Locations.l_accountNo == accountno,
                    Locations.l_locationId == locationid
                ).values(l_locationName=locationname)
            )
            if memberids:
                await session.execute(
                    LocationGroups.__table__.insert(),
                    [
                        {
                            "l_accountId": accountid,
                            "l_accountNo": accountno,
                            "l_locationId": locationid,
                            "l_memberId": memberid
                        }
                        for memberid in memberids
                    ]
                )
            await session.commit()
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def locationDelete(locationid: int, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            await session.execute(delete(Locations).where(
                    Locations.l_locationId == locationid,
                    Locations.l_accountId == accountid,
                    Locations.l_accountNo == accountno
                )
            )
            await session.commit()
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def locationFetch(limit: int = 1000, offset: int = 0, sortOrder: str = "", sortField: str = "", searchString: str = "", accountid: int = 0, accountno: str = "", database: str = ""):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            recordQuery = (
                select(
                    Locations.l_locationId,
                    Locations.l_locationName,
                    Members.m_memberId,
                    Members.m_memberName
                )
                .select_from(Locations)
                .outerjoin(LocationGroups, Locations.l_locationId == LocationGroups.l_locationId)
                .outerjoin(Members, Members.m_memberId == LocationGroups.l_memberId)
                .where(and_(
                    Locations.l_accountId == accountid,
                    Locations.l_accountNo == accountno
                ))
            )
            if searchString:
                recordQuery = recordQuery.where(
                    or_(
                        Locations.l_locationId.like(f"%{searchString}%"),
                        Locations.l_locationName.ilike(f"%{searchString}%")
                    )
                )
            Records = (await session.execute(recordQuery)).all()
            locationDetails = {}
            for Record in Records:
                locationId = Record.l_locationId
                if locationId not in locationDetails:
                    locationDetails[locationId] = {
                        "l_locationId": str(Record.l_locationId),
                        "l_locationName": Record.l_locationName,
                        "members": []
                    }
                if Record.m_memberId is not None:
                    locationDetails[locationId]["members"].append({
                        "m_memberId": Record.m_memberId,
                        "m_memberName": Record.m_memberName
                    })
            locationDetailsList = list(locationDetails.values())
            if sortField and sortOrder:
                locationDetailsList.sort(
                    key=lambda x: str(x.get(sortField) or ""),
                    reverse=str(sortOrder).lower() == "desc"
                )
            totalCount = len(locationDetailsList)
            totalRecords = locationDetailsList[offset:offset + limit]
            return {
                "totalRecordsCount": totalCount,
                "totalRecords": totalRecords
            }
        except IntegrityError as e:
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")