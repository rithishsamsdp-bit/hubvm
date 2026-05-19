from fastapi import FastAPI
from utils import lifespan
from controllers import voiceresponse_controller, flow_controller, campaign_controller, carrier_controller, report_controller
from middlewares import cors_middleware, static_middleware
from middlewares.logger_middleware import LogRequestMiddleware

app = FastAPI(lifespan=lifespan.lifespan)
app.add_middleware(LogRequestMiddleware)

cors_middleware.add(app)
static_middleware.add(app)

app.include_router(voiceresponse_controller.router)
app.include_router(flow_controller.router)
app.include_router(campaign_controller.router)
app.include_router(carrier_controller.router)
app.include_router(report_controller.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
