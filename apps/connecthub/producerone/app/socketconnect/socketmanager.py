import ssl
import time
import threading
import logging
import socketio

logger = logging.getLogger("socket_manager")
logger.setLevel(logging.INFO)

class SocketManager:
    def __init__(self, url: str, namespace: str, path: str = "/socketagent", reconnect_attempts: int = 5):
        self.url = url
        self.namespace = namespace
        self.path = path
        self.reconnect_attempts = reconnect_attempts
        self._sio = socketio.Client(
            logger=False,
            engineio_logger=False,
            reconnection=True,
            reconnection_attempts=reconnect_attempts,
            reconnection_delay=1,
            reconnection_delay_max=5,
        )
        self._sio.eio.ssl_verify = False
        self._sio.eio.ssl_context = ssl._create_unverified_context()
        self._connected = False
        self._access_token = None
        self._lock = threading.Lock()

        # Register namespace handler
        self._sio.register_namespace(self.AdminNamespace(self, namespace))

        # Start background heartbeat thread
        self._heartbeat_thread = threading.Thread(target=self._heartbeat, daemon=True)
        self._heartbeat_thread.start()

    # -------------------------
    # Namespace Handler
    # -------------------------
    class AdminNamespace(socketio.ClientNamespace):
        def __init__(self, manager, namespace):
            super().__init__(namespace)
            self.manager = manager

        def on_connect(self):
            self.manager._connected = True
            logger.info("🔌 Connected to %s", self.namespace)

        def on_disconnect(self):
            self.manager._connected = False
            logger.warning("❎ Disconnected from %s", self.namespace)

        def on_connect_error(self, data):
            logger.error("❌ Connection error to %s: %s", self.namespace, data)

        def on_response(self, data):
            logger.info("📩 Received: %s", data)

    # -------------------------
    # Public Methods
    # -------------------------
    def set_token(self, token: str):
        """Set access token for authentication."""
        with self._lock:
            self._access_token = token

    def connect(self):
        """Connect to Socket.IO server with retry logic."""
        with self._lock:
            if self._connected:
                logger.info("⚡ Socket already connected.")
                return

            if not self._access_token:
                raise ValueError("Access token not set before connecting")

            headers = {"Cookie": f"accessToken={self._access_token}"}

            retry = 0
            while not self._connected and retry < self.reconnect_attempts:
                try:
                    logger.info("🔄 Connecting to Socket.IO server (attempt %d)...", retry + 1)
                    self._sio.connect(
                        self.url,
                        headers=headers,
                        socketio_path=self.path,
                        namespaces=[self.namespace],
                        transports=["websocket"],
                    )
                    logger.info("✅ Socket connected.")
                    return
                except Exception as e:
                    retry += 1
                    logger.error("❌ Connection attempt %d failed: %s", retry, e)
                    time.sleep(min(2 ** retry, 10))

            raise ConnectionError("Failed to connect to Socket.IO after multiple attempts")

    def emit(self, event_name: str, payload: dict):
        """Emit a message if connected, otherwise reconnect first."""
        if not self._connected:
            logger.warning("⚠ Socket not connected, attempting reconnect...")
            self.connect()
            time.sleep(0.5)  # small wait for connection to establish

        logger.info("📤 Emitting %s: %s", event_name, payload)
        self._sio.emit(event_name, payload, namespace=self.namespace)

    def disconnect(self):
        """Graceful disconnect."""
        with self._lock:
            if self._connected:
                self._sio.disconnect()
                self._connected = False
                logger.info("🔌 Socket disconnected gracefully.")

    # -------------------------
    # Private Methods
    # -------------------------
    def _heartbeat(self, interval: int = 10):
        """Send a periodic ping to keep the connection alive."""
        while True:
            time.sleep(interval)
            if self._connected:
                try:
                    self._sio.emit("ping", {"timestamp": time.time()}, namespace=self.namespace)
                    logger.debug("💓 Heartbeat sent")
                except Exception as e:
                    logger.warning("❌ Heartbeat failed: %s", e)


# ---------------------------------------------------------
# Singleton instance
# ---------------------------------------------------------
socket_manager = SocketManager(
    url="https://connecthub.pulsework360.com",
    namespace="/socketagent/agentevent",
    path="/socketagent"
)
