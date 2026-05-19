from fastapi import APIRouter, Query
from services import cdr_service
from datetime import datetime
from typing import Optional, Dict
import json

router = APIRouter(
    prefix="/telephony/cdr",
    tags=["CDR"]
)

@router.get("/export")
async def export_cdr(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    database: str = Query(..., description="Database name"),
    campaign_id: Optional[int] = Query(None, description="Optional Campaign ID"),
    selected_columns: str = Query("{}", description="JSON string of selected columns"),
    filename: str = Query("cdr_report", description="Filename for the export")
):
    try:
        selected_columns_dict = json.loads(selected_columns)

        response = await cdr_service.export_cdr_report(
            start_date=start_date,
            end_date=end_date,
            database=database,
            campaign_id=campaign_id,
            selected_columns=selected_columns_dict,
            filename=filename
        )
        
        # response.headers.update({
        #     "Content-Disposition": f'attachment; filename="{filename}.csv"',
        #     "Transfer-Encoding": "chunked",
        #     "Content-Type": "text/csv",
        #     "Cache-Control": "no-cache, no-store, must-revalidate",
        #     "Pragma": "no-cache",
        #     "Expires": "0",
        #     "X-Accel-Buffering": "no"  # Disable buffering (Nginx)
        # })
        
        return response
    
    except json.JSONDecodeError:
        return {"error": "Invalid JSON format in selected_columns"}
