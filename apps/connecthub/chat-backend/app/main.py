# main.py — FastAPI app entry point (matches socketioserver pattern exactly)
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from utils.lifespan import lifespan
from middlewares import cors_middleware, static_middleware
from exception import validation_exception_handler
from controllers import user_controller, room_controller, message_controller
from socketcore.core import sio
from chatsocket.chat_namespace import ChatNamespace
import socketio

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="ConnectHub Chat API",
    version="1.0.0",
    description="Real-time team chat — REST + Socket.IO",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
cors_middleware.add(app)
static_middleware.add(app)

# ── Exception handlers ────────────────────────────────────────────────────────
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# ── REST Routers ──────────────────────────────────────────────────────────────
app.include_router(user_controller.router)
app.include_router(room_controller.router)
app.include_router(message_controller.router)
# app.include_router(upload_controller.router) # Merged into message_controller

# ── Socket.IO namespace registration ─────────────────────────────────────────
sio.register_namespace(ChatNamespace("/chat"))

# ── Combined ASGI app (FastAPI + Socket.IO) ───────────────────────────────────
# socket_path "/chatsocket" → nginx proxies /chatsocket/* to this service
combined_asgi_app = socketio.ASGIApp(sio, app, socketio_path="/chatsocket")

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/chat/health")
async def health():
    return {"status": "ok", "service": "connecthub-chat"}

# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(combined_asgi_app, host="0.0.0.0", port=5060, reload=True)
