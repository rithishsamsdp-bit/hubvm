from fastapi import APIRouter, Request, status, HTTPException
from services import auto_qc_service

router = APIRouter(
    prefix="/telephony/auto_qc",
    tags=["auto_qc"]
)

@router.post("/insert", status_code=status.HTTP_201_CREATED)
async def insert_auto_qc(request: Request):
    """
    API to simply consume request data and insert it into auto_qc MongoDB collection.
    It does not require authorization.
    """
    try:
        data = await request.json()
        if not data:
            raise HTTPException(status_code=400, detail="Empty request body")
        
        response = await auto_qc_service.insert_data(data)
        return response
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON in request body")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
