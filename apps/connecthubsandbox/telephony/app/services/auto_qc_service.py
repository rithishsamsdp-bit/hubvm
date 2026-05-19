from repos import auto_qc_repo
from fastapi import HTTPException

async def insert_data(data: dict):
    try:
        inserted_id = await auto_qc_repo.insert_auto_qc_data(data)
        return {"status": "success", "message": "Data inserted successfully", "inserted_id": inserted_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
