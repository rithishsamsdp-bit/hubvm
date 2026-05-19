from fastapi import FastAPI
from utils import lifespan
from controllers import originator_controller
from middlewares import cors_middleware, static_middleware
# from middlewares.logger_middleware import LogRequestMiddleware
from kafka.consumer_manager import start_consumers

app = FastAPI(lifespan=lifespan.lifespan)
# app.add_middleware(LogRequestMiddleware)

cors_middleware.add(app)
static_middleware.add(app)

app.include_router(originator_controller.router)

@app.on_event("startup")
async def startup_event():
    await start_consumers()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
