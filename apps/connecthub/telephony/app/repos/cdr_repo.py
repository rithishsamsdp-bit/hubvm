import asyncio
import csv
import io
import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text
from db.context import get_async_engine
from fastapi.responses import StreamingResponse
from typing import Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def export_cdr_data(
    start_date: str, 
    end_date: str, 
    database: str, 
    campaign_id: Optional[int], 
    selected_columns: Dict[str, str], 
    filename: str,
    batch_size: int = 5000  
):
    engine = get_async_engine(database)
    selected_db_columns = list(selected_columns.keys())

    query_str = f"""
        SELECT {', '.join(selected_db_columns)}
        FROM p_ivrblastlogs
        WHERE i_callDate BETWEEN :start_date AND :end_date
    """
    if campaign_id:
        query_str += " AND i_campaignId = :campaign_id"

    query = text(query_str)

    async def data_generator():
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        writer.writerow(["S.No"] + list(selected_columns.values()))
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        async with AsyncSession(engine) as session:
            params = {"start_date": start_date, "end_date": end_date}
            if campaign_id:
                params["campaign_id"] = campaign_id

            result = await session.execute(query, params)

            serial_no = 1
            while True:
                chunk = result.fetchmany(batch_size)
                if not chunk:
                    break

                for row in chunk:
                    writer.writerow([serial_no] + list(row))
                    serial_no += 1

                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)

                await asyncio.sleep(0)

        logger.info("✅ Streaming complete.")

    # ✅ Ensure filename includes date-time safely
    safe_start_date = start_date.replace(" ", "_").replace(":", "-")
    safe_end_date = end_date.replace(" ", "_").replace(":", "-")
    safe_filename = f"{filename}-{safe_start_date}-{safe_end_date}.csv"
    safe_filename = re.sub(r'[^\w\-.]', '_', safe_filename)

    logger.info(f"🔹 Generated Filename: {safe_filename}")

    return StreamingResponse(
        data_generator(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Transfer-Encoding": "chunked",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Content-Type-Options": "nosniff",
        }
    )
