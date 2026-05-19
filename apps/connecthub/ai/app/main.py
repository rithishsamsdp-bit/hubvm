"""
main.py — mirrors agentconversation/app/main.py pattern.
Uses asynccontextmanager lifespan (modern FastAPI pattern).
"""
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.context import get_async_engine, killEngines, Base
from controllers import bot_controller, phone_call_controller
from controllers.voice_controller import voice_router
import models.db   # noqa: F401 — registers all ORM models before create_all

# ── Logging Configuration ─────────────────────────────────────────────────
LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)-18s | %(message)s"
logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
    force=True,
)
# Quieten noisy third-party loggers
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

logger = logging.getLogger("app")


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────
    print("[APP] Startup triggered")

    engine = get_async_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("[APP] PostgreSQL Engine warmed up — tables ready")

    yield

    # ── Shutdown ───────────────────────────────────────────────
    print("[APP] Shutdown triggered")
    await killEngines()
    print("[APP] PostgreSQL Engine killed")


app = FastAPI(title="AI Call Center Service", version="1.0.0", lifespan=app_lifespan)

# ── Middleware ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────
app.include_router(voice_router)                                                      # /ws/voice/{id}
app.include_router(bot_controller.router, prefix="/api/ai")                          # /api/ai/bots
app.include_router(phone_call_controller.phone_router, prefix="/api/ai")             # /api/ai/phone-numbers
app.include_router(phone_call_controller.call_router, prefix="/api/ai")              # /api/ai/calls


@app.get("/")
def read_root():
    return {"message": "AI Call Center Service v1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
