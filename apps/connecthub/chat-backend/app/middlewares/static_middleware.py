# middlewares/static_middleware.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

def add(app: FastAPI):
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    os.makedirs(static_dir, exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
