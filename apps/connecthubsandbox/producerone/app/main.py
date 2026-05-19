from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from utils import lifespan
from controllers import livemonitor_controller
from middlewares import cors_middleware, static_middleware, requestlog
from db.context import get_async_enginenew, dispose_engines
from exception import RequestValidation
from producer import kafkaproducer
app = FastAPI(lifespan=lifespan.lifespan)

cors_middleware.add(app)
static_middleware.add(app)
# requestlog.add_request_logger(app)


app.include_router(livemonitor_controller.router)
app.add_exception_handler(RequestValidationError, RequestValidation.validation_exception_handler)
# app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)

@app.on_event("startup")
async def startup():
    # Optional: warm up engines
    await kafkaproducer.start_producer()
    test_engine = get_async_enginenew("onedb")
    async with test_engine.begin() as conn:
        await conn.run_sync(lambda x: None)

@app.on_event("shutdown")
async def shutdown():
    global _producer
    if kafkaproducer._producer:
        await kafkaproducer._producer.stop()
    await dispose_engines()
