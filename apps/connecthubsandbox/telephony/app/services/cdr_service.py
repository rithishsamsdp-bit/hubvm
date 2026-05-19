from fastapi.responses import StreamingResponse
from repos import cdr_repo
from datetime import datetime
from typing import Optional, Dict

async def export_cdr_report(start_date: str, end_date: str, database: str, campaign_id: Optional[int] = None, selected_columns: Optional[Dict[str, str]] = None, filename: str = "cdr_report"):
    return await cdr_repo.export_cdr_data(start_date, end_date, database, campaign_id, selected_columns, filename)
