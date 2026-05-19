from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from utils import lifespan
from controllers import auth_controller, account_controller, saml_controller
from middlewares import cors_middleware, static_middleware
from db.context import asyncEngineFactory, killEngines, init_redis, close_redis
from exception import RequestValidation

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from services.saml_scheduler_service import run_saml_sync_for_all_customers

# -------- Scheduler --------
scheduler = AsyncIOScheduler(
    executors={"default": AsyncIOExecutor()}
)

@asynccontextmanager
async def app_lifespan(app: FastAPI):

    # -------- Startup --------
    print("[APP] Startup triggered")

    warmup_engine = asyncEngineFactory("onedb")
    async with warmup_engine.begin() as conn:
        await conn.run_sync(lambda _: None)

    print("[APP] MySQL Engine warmed Up")

    await init_redis()

    print("[APP] Redis Engine warmed Up")

    scheduler.add_job(
        run_saml_sync_for_all_customers,
        "cron",
        hour="6,18",
        id="saml_sync_job",
        replace_existing=True
    )
    scheduler.start()

    print("[APP] Scheduler started")
    print("[APP] Jobs:", scheduler.get_jobs())

    yield

    # -------- Shutdown --------
    print("[APP] Shutdown triggered")

    scheduler.shutdown()

    print("[APP] Scheduler stopped")

    await killEngines()

    print("[APP] MySQL Engine Killed")

    await close_redis()

    print("[APP] Redis Engine Killed")  

# --- FastAPI app ---
app = FastAPI(lifespan=app_lifespan)

# Middleware setup start 
cors_middleware.add(app)
static_middleware.add(app)
# Middleware setup end

# Request Input Validation Exception Handler start
app.add_exception_handler(RequestValidationError, RequestValidation.validation_exception_handler)
# Request Input Validation Exception Handler end

# Route setup start 
app.include_router(auth_controller.router)
app.include_router(account_controller.router)
app.include_router(saml_controller.router)
# Route setup end

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)














    # scheduler.add_job(
    #     run_saml_sync_for_all_customers,
    #     "interval",
    #     minutes=1,      # change to cron if needed
    #     id="saml_sync_job",
    #     replace_existing=True
    # )
    # scheduler.add_job(
    #     run_saml_sync_for_all_customers,
    #     "cron",
    #     hour=17,
    #     minute=0,
    #     id="saml_sync_job",
    #     replace_existing=True
    # )