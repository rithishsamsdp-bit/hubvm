from fastapi import FastAPI
from utils import lifespan
from controllers import routing_controller
from middlewares import cors_middleware, static_middleware, requestlog
from fastapi.exceptions import RequestValidationError
from exception import RequestValidation
from producer import kafkaproducer


app = FastAPI(lifespan=lifespan.lifespan)

# Middleware setup start 
cors_middleware.add(app)
static_middleware.add(app)
requestlog.add_request_logger(app)
# Middleware setup end

app.add_exception_handler(RequestValidationError, RequestValidation.validation_exception_handler)

# Route setup start 
app.include_router(routing_controller.router)
# Route setup end

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)


@app.on_event("startup")
async def startup():
    # Optional: warm up engines
    await kafkaproducer.start_producer()


@app.on_event("shutdown")
async def shutdown():
    global _producer
    if kafkaproducer._producer:
      await kafkaproducer._producer.stop()