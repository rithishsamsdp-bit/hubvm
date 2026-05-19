from fastapi import FastAPI
from utils import lifespan
from controllers import auth_controller
from middlewares import cors_middleware, static_middleware
from db.context import asyncEngineFactory, killEngines

app = FastAPI(lifespan=lifespan.lifespan)

cors_middleware.add(app)
static_middleware.add(app)

app.include_router(auth_controller.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)

@app.on_event("startup")
async def startup():
    warmupEngine = asyncEngineFactory("onedb")
    async with warmupEngine.begin() as tether:
        await tether.run_sync(lambda x: None)

@app.on_event("shutdown")
async def shutdown():
    await killEngines()