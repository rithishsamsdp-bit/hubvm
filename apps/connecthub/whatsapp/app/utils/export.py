import io
import csv
import re
import asyncio
import logging
from fastapi.responses import StreamingResponse
from typing import List, Callable, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

async def cdrexport(session: AsyncSession,query_or_list: Union[Select, List[dict]], filename: str,csv_headers: List[str],
row_formatter: Callable,batch_size: int = 5000):
    async def data_generator():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["S.No"] + csv_headers)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        serial_no = 1

        try:
            # If it's a SQLAlchemy Select, stream it
            if isinstance(query_or_list, Select):
                result = await session.stream(query_or_list)
                async for partition in result.partitions(batch_size):
                    for row in partition:
                        writer.writerow(row_formatter(row, serial_no))
                        serial_no += 1
                    yield buffer.getvalue()
                    buffer.seek(0)
                    buffer.truncate(0)
                    await asyncio.sleep(0)
            # If it's already a Python list
            elif isinstance(query_or_list, list):
                for row in query_or_list:
                    writer.writerow(row_formatter(row, serial_no))
                    serial_no += 1
                    if serial_no % batch_size == 0:
                        yield buffer.getvalue()
                        buffer.seek(0)
                        buffer.truncate(0)
                        await asyncio.sleep(0)
                yield buffer.getvalue()
            else:
                raise ValueError("query_or_list must be a SQLAlchemy Select or a Python list")
        except Exception as e:
            logging.exception("Error during CDR export: %s", e)
            raise
        finally:
            await session.close()
            
    safe_filename = f"{filename}.csv"
    safe_filename = re.sub(r'[^\w\-.]', '_', safe_filename)

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
