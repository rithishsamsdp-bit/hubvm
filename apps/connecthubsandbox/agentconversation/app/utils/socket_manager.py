from http.cookies import SimpleCookie
from datetime import datetime, timedelta
from config import settings
import ssl, time, threading, logging, socketio, requests

logger = logging.getLogger("socket_manager")
logger.setLevel(logging.INFO)

class SocketManager:
    def __init__(self, url: str, namespace: str, path: str = "/socketagent", reconnect_attempts: int = 5):
        self.url = url
        self.namespace = namespace
        self.path = path
        self.reconnect_attempts = reconnect_attempts
        self.token_expiry = None

        # Loaded via external config.json or env (you must provide these)
        self.config = {
            "login_url": "https://connecthub.pulsework360.com/auth/login",
            "account_code": "PUTPL",
            "member_name": "ssadmin",
            "member_password": "Pulse@123"
        }

        # Socket
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

        # Register namespace
        self._sio.register_namespace(self.AdminNamespace(self, namespace))

        # Heartbeat thread
        self._heartbeat_thread = threading.Thread(target=self._heartbeat, daemon=True)
        self._heartbeat_thread.start()

    # -------------------------
    # Namespace Events
    # -------------------------
    class AdminNamespace(socketio.ClientNamespace):
        def __init__(self, manager, namespace):
            super().__init__(namespace)
            self.manager = manager

        def on_connect(self):
            self.manager._connected = True
            logger.info("🔌 Connected to socket namespace %s", self.namespace)

        def on_disconnect(self):
            self.manager._connected = False
            logger.warning("❎ Disconnected from socket namespace %s", self.namespace)

        def on_connect_error(self, data):
            logger.error("❌ Connection error: %s", data)

    # -------------------------
    # Access Token Flow
    # -------------------------
    def set_access_token(self, token: str):
        """Store token for socket authentication."""
        with self._lock:
            self._access_token = token
            logger.info("🔑 Access token set.")

    def get_access_token(self):
        try:
            session = requests.Session()
            payload = {
                "accountcode": self.config['account_code'],
                "membername": self.config['member_name'],
                "memberpassword": self.config['member_password']
            }
            response = session.post(
                self.config['login_url'],
                json=payload,
                headers={'Content-Type': 'application/json'},
                verify=False,
                timeout=10
            )
            if response.status_code != 200:
                logger.error(f"Login failed: {response.status_code} → {response.text}")
                return None
            cookie_header = response.headers.get("Set-Cookie") or response.headers.get("set-cookie")
            if not cookie_header:
                logger.error("❌ Login successful but Set-Cookie missing")
                return None

            cookie = SimpleCookie()
            cookie.load(cookie_header)

            if "accessToken" not in cookie:
                logger.error("❌ accessToken not found inside cookie")
                return None

            access_token = cookie["accessToken"].value
            self.token_expiry = datetime.now() + timedelta(hours=1)

            logger.info("✅ Access Token retrieved successfully")
            return access_token

        except Exception as e:
            logger.error(f"❌ Exception retrieving access token: {e}")
            return None

    # -------------------------
    # Socket connection logic
    # -------------------------
    def connect(self):
        """Connect to Socket.IO using stored access token."""
        with self._lock:
            if self._connected:
                return

            if not self._access_token:
                raise ValueError("Access token not set")

            headers = {"Cookie": f"accessToken={self._access_token}"}

            retry = 0
            while not self._connected and retry < self.reconnect_attempts:
                try:
                    self._sio.connect(
                        self.url,
                        headers=headers,
                        socketio_path=self.path,
                        namespaces=[self.namespace],
                        transports=["websocket"],
                    )
                    return
                except Exception as e:
                    retry += 1
                    logger.error("❌ Connection attempt %d failed: %s", retry, e)
                    time.sleep(2)

            raise ConnectionError("Failed to connect after retries.")

    def emit(self, event_name: str, payload: dict):
        """Emit a message. If disconnected, refresh token and reconnect."""
        try:
            if self._connected:
                logger.info(f"📤 Emitting {event_name}: {payload}")
                self._sio.emit(event_name, payload, namespace=self.namespace)
                return
            logger.warning("⚠ Socket not connected. Re-authenticating & reconnecting...")
            new_token = self.get_access_token()
            if not new_token:
                logger.error("❌ Cannot emit — failed to obtain access token.")
                return
            self.set_access_token(new_token)
            self.connect()
            time.sleep(0.5)
            if not self._connected:
                logger.error("❌ Still disconnected after reconnect attempt")
                return
            logger.info(f"📤 Emitting after reconnect {event_name}: {payload}")
            self._sio.emit(event_name, payload, namespace=self.namespace)

        except Exception as e:
            logger.error(f"❌ Emit failed: {e}")

    def _heartbeat(self, interval=10):
        """Keep socket live."""
        while True:
            time.sleep(interval)
            if self._connected:
                try:
                    self._sio.emit("ping", {"timestamp": time.time()}, namespace=self.namespace)
                except:
                    pass

# Global singleton
socket_manager = SocketManager(
    url="https://connecthub.pulsework360.com",
    namespace="/socketagent/agentevent",
    path="/socketagent"
)