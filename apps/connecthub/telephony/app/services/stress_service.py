import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import stress_repo
from datetime import datetime
from typing import Optional
from pydantic import EmailStr
from utils.redis_hash import generate_cache_hash_key
import json


async def create():
    return await stress_repo.create()