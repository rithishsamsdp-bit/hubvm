from fastapi import FastAPI
from utils import lifespan
from agenteventsocket.socketfunction import agentevent
from middlewares import cors_middleware, static_middleware, requestlog
from fastapi.exceptions import RequestValidationError
from exception import RequestValidation
from fastapi.staticfiles import StaticFiles
from socketcore.core import sio
import socketio
import logging
import os
from socketio import AsyncRedisManager

# Optional: Enable detailed socketio logs
os.environ["DEBUG"] = "socketio.*"

# Logger setup
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("main")

# Create FastAPI app
app = FastAPI(lifespan=lifespan.lifespan)

# Middleware setup
cors_middleware.add(app)
static_middleware.add(app)
requestlog.add_request_logger(app)

# Mount static files
app.mount('/static', StaticFiles(directory='static'), name='static')

# Register namespace
sio.register_namespace(agentevent("/socketagent/agentevent"))

# Wrap FastAPI with Socket.IO
combined_asgi_app = socketio.ASGIApp(sio, app, socketio_path="/socketagent")

# Exception handler
app.add_exception_handler(RequestValidationError, RequestValidation)

# Run server
if __name__ == "__main__":
    logger.info("Starting FastAPI + Socket.IO server...")
    import uvicorn
    uvicorn.run(combined_asgi_app, host="0.0.0.0", port=3000, reload=True)
