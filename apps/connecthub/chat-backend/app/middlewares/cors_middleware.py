# middlewares/cors_middleware.py — CORS config (matches all existing services)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def add(app: FastAPI):
    origins = [
        "http://connecthub.pulsework360.com",
        "https://connecthub.pulsework360.com",
        "http://localhost:5173",
        "https://connecthub-ivr.pulsework360.com",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,   # Required for cookie-based auth
        allow_methods=["*"],
        allow_headers=["*"],
    )
