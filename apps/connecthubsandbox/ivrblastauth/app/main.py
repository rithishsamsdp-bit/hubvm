from fastapi import FastAPI
from utils import lifespan
from controllers import auth_controller, company_onbording
from middlewares import cors_middleware, static_middleware

app = FastAPI(lifespan=lifespan.lifespan)

cors_middleware.add(app)
static_middleware.add(app)

app.include_router(auth_controller.router)
app.include_router(company_onbording.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
