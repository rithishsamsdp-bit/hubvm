# socketcore/core.py — python-socketio async server instance (shared singleton)
# When ENABLE_REDIS=true, uses Redis adapter so events sync across multiple pods.
import socketio
from config import settings

mgr = None
if settings.ENABLE_REDIS:
    mgr = socketio.AsyncRedisManager(settings.REDIS_URL)

# AsyncServer with CORS origins matching all existing services
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        "http://connecthub.pulsework360.com",
        "https://connecthub.pulsework360.com",
        "http://localhost:5173",
        "https://connecthub-ivr.pulsework360.com",
    ],
    client_manager=mgr,
    logger=False,
    engineio_logger=False,
)
