# Triggering reload for emergency refinements
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from config import settings
from contextlib import asynccontextmanager
from utils import lifespan
from producer.emergency_orchestrator import run_orchestrator
from controllers import holiday_controller, b_hours_controller, blacklist_controller, peer_controller, cdr_export_router, contact_controller, clinumber_controller, stress_controller, process_controller, member_controller, memberGroup_controller, campaign_controller, queueGroup_controller, callflow_controller, form_controller, list_controller, tlmapping_controller, lead_controller, sms_template_controller, emergency_controller, auto_qc_controller, proxyemailtrigger_controller
from middlewares import cors_middleware, static_middleware, requestlog
from db.context import asyncEngineFactory, killEngines, init_redis, close_redis
from exception import RequestValidation
import asyncio, logging

@asynccontextmanager
async def app_lifespan(app: FastAPI):

    # -------- Startup --------
    print("[APP] Startup triggered")

    warmup_engine = asyncEngineFactory("onedb")
    async with warmup_engine.begin() as conn:
        await conn.run_sync(lambda _: None)

    print("[APP] MySQL Engine warmed Up")

    if settings.ENABLE_REDIS:
        await init_redis()
        print("[APP] Redis Engine warmed Up")
    else:
        print("[APP] Redis Disabled (Local Mode)")

    # Start Emergency Orchestrator in background
    asyncio.create_task(run_orchestrator())
    print("[APP] Emergency Orchestrator started in background")

    # Start Emergency Campaign Scheduler
    from utils import background_schedule_task
    background_schedule_task.start()
    print("[APP] Emergency Campaign Scheduler started")

    yield

    # -------- Shutdown --------
    print("[APP] Shutdown triggered")

    # Shutdown Scheduler
    from utils import background_schedule_task
    await background_schedule_task.shutdown()
    print("[APP] Emergency Campaign Scheduler stopped")

    await killEngines()

    print("[APP] MySQL Engine Killed")

    if settings.ENABLE_REDIS:
        await close_redis()
        print("[APP] Redis Engine Killed")
    else:
        print("[APP] Redis Disabled (Local Mode)")

# --- FastAPI app ---
app = FastAPI(lifespan=app_lifespan)

# Middleware setup start 
cors_middleware.add(app)
static_middleware.add(app)
requestlog.add_request_logger(app)
# Middleware setup end

# Request Input Validation Exception Handler start
app.add_exception_handler(RequestValidationError, RequestValidation.validation_exception_handler)
# Request Input Validation Exception Handler end

# Route setup start 
app.include_router(blacklist_controller.router)
app.include_router(peer_controller.router)
app.include_router(holiday_controller.router)
app.include_router(b_hours_controller.router)
app.include_router(cdr_export_router.router)
app.include_router(contact_controller.router)
app.include_router(clinumber_controller.router)
app.include_router(process_controller.router)
app.include_router(member_controller.router)
app.include_router(memberGroup_controller.router)
app.include_router(campaign_controller.router)
app.include_router(queueGroup_controller.router)
app.include_router(callflow_controller.router)
app.include_router(form_controller.router)
app.include_router(list_controller.router)
app.include_router(tlmapping_controller.router)
app.include_router(lead_controller.router)
app.include_router(sms_template_controller.router)
app.include_router(emergency_controller.router)
app.include_router(auto_qc_controller.router)
app.include_router(proxyemailtrigger_controller.router)
# Route setup end

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)