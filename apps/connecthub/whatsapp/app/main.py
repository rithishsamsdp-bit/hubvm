from fastapi import FastAPI
from utils import lifespan
from controllers import whatsapp_template_controller, delivery_response_controller, whatsapp_dashboard_controller, whatsapp_group_controller, whatsapp_onboard_controller
from middlewares import cors_middleware, static_middleware
from fastapi.exceptions import RequestValidationError
from exception import RequestValidation

app = FastAPI(lifespan=lifespan.lifespan)

# Middleware setup start 
cors_middleware.add(app)
static_middleware.add(app)

# Middleware setup end

# Request Input Validation Exception Handler start
app.add_exception_handler(RequestValidationError, RequestValidation.validation_exception_handler)
# Request Input Validation Exception Handler end

# Route setup start 
# app.include_router(blacklist_controller.router)
app.include_router(whatsapp_template_controller.router)
app.include_router(delivery_response_controller.router)
app.include_router(whatsapp_dashboard_controller.router)
app.include_router(whatsapp_group_controller.router)
app.include_router(whatsapp_onboard_controller.router)
# Route setup end

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
