from sqlalchemy import text, select, func, and_
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from db.context import asyncSessionFactory
from models.db import RequestLog
from datetime import datetime


async def fetch(limit: int, offset: int, account_id: int, pod_name: str,
                method: str, status_code: int, start_date: str, end_date: str,
                database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            filters = []
            if account_id:
                filters.append(RequestLog.r_account_id == account_id)
            if pod_name:
                filters.append(RequestLog.r_pod_name == pod_name)
            if method:
                filters.append(RequestLog.r_method == method.upper())
            if status_code:
                filters.append(RequestLog.r_statusCode == status_code)
            if start_date:
                filters.append(RequestLog.r_timestamp >= start_date)
            if end_date:
                filters.append(RequestLog.r_timestamp <= end_date)

            base_query = select(RequestLog)
            count_query = select(func.count()).select_from(RequestLog)

            if filters:
                base_query = base_query.where(and_(*filters))
                count_query = count_query.where(and_(*filters))

            total_count = (await session.execute(count_query)).scalar()

            rows = (await session.execute(
                base_query.order_by(RequestLog.r_timestamp.desc())
                         .limit(limit).offset(offset)
            )).scalars().all()

            records = []
            for row in rows:
                records.append({
                    "r_id": row.r_id,
                    "r_method": row.r_method,
                    "r_url": row.r_url,
                    "r_request_body": row.r_requestBody,
                    "r_response_body": row.r_responseBody,
                    "r_status_code": row.r_statusCode,
                    "r_duration": row.r_duration,
                    "r_timestamp": str(row.r_timestamp) if row.r_timestamp else None,
                    "r_account_id": row.r_account_id,
                    "r_pod_name": row.r_pod_name,
                })

            return {"totalRecords": records, "totalRecordsCount": total_count}

        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))
