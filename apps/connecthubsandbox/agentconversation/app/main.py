from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from utils import lifespan, scheduler
from utils.socket_manager import socket_manager
from controllers import pulsecallevent_controller, conversation_controller, chat_controller, agentstate_controller, list_controller ,dashboard_controller, notification_controller
from middlewares import cors_middleware, static_middleware, requestlog
from exception import RequestValidation
from producer import kafkaproducer
import threading
from contextlib import asynccontextmanager
from db.context import asyncEngineFactory, killEngines, init_redis, close_redis
from services import list_service 

@asynccontextmanager
async def app_lifespan(app: FastAPI):

    # -------- Startup --------
    print("[APP] Startup triggered")

    warmup_engine = asyncEngineFactory("onedb")
    async with warmup_engine.begin() as conn:
        await conn.run_sync(lambda _: None)

    print("[APP] MySQL Engine warmed Up")

    await init_redis()
    await list_service.init_firebase()
    print("[APP] Redis Engine warmed Up")

    scheduler.start_scheduler()
    print("[APP] Scheduler Started")

    token = socket_manager.get_access_token()
    if token:
        socket_manager.set_access_token(token)
        threading.Thread(target=socket_manager.connect, daemon=True).start()
        print("[APP] Connected Socket")

    yield

    # -------- Shutdown --------
    print("[APP] Shutdown triggered")

    await killEngines()

    print("[APP] MySQL Engine Killed")

    await close_redis()

    print("[APP] Redis Engine Killed") 

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
app.include_router(pulsecallevent_controller.router)
app.include_router(conversation_controller.router)
app.include_router(chat_controller.router)
app.include_router(agentstate_controller.router)
app.include_router(list_controller.router)
app.include_router(dashboard_controller.router)
app.include_router(notification_controller.router)
# Route setup end

# @app.on_event("startup")
# async def startup():
#     warmupEngine = asyncEngineFactory("onedb")
#     async with warmupEngine.begin() as tether:
#         await tether.run_sync(lambda x: None)
#         print("[APP] WarmedUp SQL Engine")
#     scheduler.start_scheduler()
#     token = socket_manager.get_access_token()
#     if token:
#         socket_manager.set_access_token(token)
#         threading.Thread(target=socket_manager.connect, daemon=True).start()
#         print("[APP] Connected Socket")

# @app.on_event("shutdown")
# async def shutdown():
#     # global _producer
#     await killEngines()
#     # if kafkaproducer._producer:
#         # await kafkaproducer._producer.stop()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)