from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from utils import lifespan
from controllers import report_controller
from middlewares import cors_middleware, static_middleware, requestlog
from db.context import asyncEngineFactory, killEngines, init_redis, close_redis
from exception import RequestValidation

@asynccontextmanager
async def app_lifespan(app: FastAPI):

    # -------- Startup --------
    print("[APP] Startup triggered")

    from utils import background_schedule_task
    background_schedule_task.start()

    warmup_engine = asyncEngineFactory("onedb")
    async with warmup_engine.begin() as conn:
        await conn.run_sync(lambda _: None)

    print("[APP] MySQL Engine warmed Up")

    await init_redis()

    print("[APP] Redis Engine warmed Up")

    yield

    # -------- Shutdown --------
    print("[APP] Shutdown triggered")

    background_schedule_task.shutdown()

    await killEngines()

    print("[APP] MySQL Engine Killed")

    await close_redis()

    print("[APP] Redis Engine Killed")

app = FastAPI(lifespan=app_lifespan)

cors_middleware.add(app)
static_middleware.add(app)
requestlog.add_request_logger(app)

app.add_exception_handler(
    RequestValidationError,
    RequestValidation.validation_exception_handler
)

app.include_router(report_controller.router)
