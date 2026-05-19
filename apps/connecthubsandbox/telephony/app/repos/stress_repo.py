from db.context import  get_async_engine, get_redis_client_by_db
from sqlalchemy import Delete
from sqlalchemy import Update, select,func
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import stress
from fastapi import HTTPException
from sqlalchemy.exc import  SQLAlchemyError
import json
from fastapi import  status
from fastapi.responses import JSONResponse
from typing import Optional
import threading
import time

# CPU load function
def cpu_stress():
    while True:
        _ = sum(i * i for i in range(10000))  # Keeps CPU busy

# RAM load function
def ram_stress(size_in_mb=500):
    data = []
    block = "x" * 1024 * 1024  # 1 MB block
    for _ in range(size_in_mb):
        data.append(block)
        time.sleep(0.05)  # Gradual memory ramp-up
    while True:
        time.sleep(1)  # Keep memory allocated

async def create(cpu_threads: int = 4, ram_mb: int = 500):

    for _ in range(cpu_threads):
        t = threading.Thread(target=cpu_stress)
        t.daemon = True
        t.start()

    # Start RAM stress thread
    t = threading.Thread(target=ram_stress, args=(ram_mb,))
    t.daemon = True
    t.start()

    return {
        "message": f"Started stress test with {cpu_threads} CPU threads and {ram_mb}MB RAM consumption."
    }