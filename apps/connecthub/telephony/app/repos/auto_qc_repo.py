from db.context import asyncClientFactory
from datetime import datetime

async def insert_auto_qc_data(data: dict):
    _, db = asyncClientFactory("onedb")
    collection = db["auto_qc"]
    
    # Add a timestamp so we know when it was inserted
    if "createdAt" not in data:
        data["createdAt"] = datetime.now()

    result = await collection.insert_one(data)
    return str(result.inserted_id)
