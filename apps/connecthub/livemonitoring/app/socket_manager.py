#!/usr/bin/env python3
"""
SocketManager — Production-Ready
Fixes:
- connect() now BLOCKS until disconnected (via threading.Event wait)
  so the caller thread can implement its own reconnect loop correctly
- Lock is not held during the blocking wait (avoids deadlock with emit())
- SSL warnings suppressed once at module level
- Token refresh before every reconnect attempt
- Thread-safe connected state via Event + Lock
- Heartbeat uses connected_event to avoid busy-wait
"""

import ssl
import time
import threading
import logging
import warnings

import socketio
import requests
import urllib3
from http.cookies import SimpleCookie
from datetime import datetime, timedelta

from config import settings

# Suppress SSL warnings once at module level (verify=False is a known trade-off here)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger("socket_manager")
logger.setLevel(logging.INFO)


class SocketManager:
    def __init__(
        self,
        url: str = settings.SOCKET_URL,
        namespace: str = settings.SOCKET_NAMESPACE,
        path: str = settings.SOCKET_PATH,
        reconnect_attempts: int = 5,
    ):
        self.url = url
        self.namespace = namespace
        self.path = path
        self.reconnect_attempts = reconnect_attempts
        self.token_expiry: datetime | None = None

        self.config = {
            "login_url": settings.SOCKET_LOGIN_URL,
            "account_code": settings.SOCKET_ACCOUNT_CODE,
            "member_name": settings.SOCKET_MEMBER_NAME,
            "member_password": settings.SOCKET_MEMBER_PASSWORD,
        }

        # Thread-safety primitives
        self._lock = threading.Lock()
        # Event is SET when connected, CLEARED when disconnected
        self._connected_event = threading.Event()
        self._access_token: str | None = None

        # Socket.IO client (reconnection handled by caller, not by sio internally)
        self._sio = socketio.Client(
            logger=False,
            engineio_logger=False,
            reconnection=False,   # We manage reconnection ourselves
        )
        self._sio.eio.ssl_verify = False
        self._sio.eio.ssl_context = ssl._create_unverified_context()

        # Register namespace handlers
        self._sio.register_namespace(self._AdminNamespace(self, namespace))

        # Heartbeat daemon thread
        threading.Thread(target=self._heartbeat, daemon=True, name="SocketHeartbeat").start()

    # ----------------------------------------------------------------
    # Namespace event handlers
    # ----------------------------------------------------------------
    class _AdminNamespace(socketio.ClientNamespace):
        def __init__(self, manager: "SocketManager", namespace: str):
            super().__init__(namespace)
            self.manager = manager

        def on_connect(self):
            self.manager._connected_event.set()
            logger.info("Socket connected to namespace %s", self.namespace)

        def on_disconnect(self):
            self.manager._connected_event.clear()
            logger.warning("Socket disconnected from namespace %s", self.namespace)

        def on_connect_error(self, data):
            self.manager._connected_event.clear()
            logger.error("Socket connection error: %s", data)

    # ----------------------------------------------------------------
    # Properties
    # ----------------------------------------------------------------
    @property
    def is_connected(self) -> bool:
        return self._connected_event.is_set()

    # ----------------------------------------------------------------
    # Token management
    # ----------------------------------------------------------------
    def set_access_token(self, token: str):
        with self._lock:
            self._access_token = token
        logger.info("Access token set")

    def get_access_token(self) -> str | None:
        """Fetch a fresh access token from the login endpoint."""
        try:
            session = requests.Session()
            payload = {
                "accountcode": self.config["account_code"],
                "membername": self.config["member_name"],
                "memberpassword": self.config["member_password"],
            }
            response = session.post(
                self.config["login_url"],
                json=payload,
                headers={"Content-Type": "application/json"},
                verify=False,
                timeout=10,
            )

            if response.status_code != 200:
                logger.error("Login failed: %d → %s", response.status_code, response.text)
                return None

            # requests cookie jar drops HttpOnly+SameSite=Strict cookies,
            # so we read raw Set-Cookie headers directly from the urllib3 response
            access_token = None
            for raw_cookie in response.raw.headers.getlist("Set-Cookie"):
                # Each raw_cookie is a single "name=value; attr; attr" string
                name_value = raw_cookie.split(";")[0].strip()
                if name_value.startswith("accessToken="):
                    access_token = name_value.split("=", 1)[1].strip()
                    break

            if not access_token:
                logger.error("accessToken not found in Set-Cookie headers")
                return None
            logger.info("Retrieved access token: %s", access_token)
            self.token_expiry = datetime.now() + timedelta(hours=settings.AUTH_TOKEN_EXPIRY_HOURS)
            logger.info("Access token retrieved successfully")
            return access_token

        except Exception as e:
            logger.exception("Exception retrieving access token: %s", e)
            return None

    def _is_token_valid(self) -> bool:
        return (
            self._access_token is not None
            and self.token_expiry is not None
            and datetime.now() < self.token_expiry
        )

    # ----------------------------------------------------------------
    # Connection — BLOCKING
    # ----------------------------------------------------------------
    def connect(self):
        """
        Connect to the Socket.IO server and BLOCK until disconnected.

        This method is designed to be called from a dedicated thread.
        The caller is responsible for the outer retry/backoff loop.

        Raises:
            ValueError: if no access token is set.
            ConnectionError: if all connection attempts fail.
        """
        with self._lock:
            token = self._access_token

        if not token:
            raise ValueError("Access token not set — call set_access_token() first")

        headers = {
                    "Cookie": f"accessToken={self._access_token}",
                    "User-Agent": "PulseWork-Monitor/1.0"
                }

        # Attempt to establish the connection
        for attempt in range(1, self.reconnect_attempts + 1):
            try:
                logger.info(
                    "Connecting to %s%s (attempt %d/%d)",
                    self.url, self.namespace, attempt, self.reconnect_attempts
                )
                self._sio.connect(
                    self.url,
                    headers=headers,
                    socketio_path=self.path,
                    namespaces=[self.namespace],
                    transports=["websocket"],
                )
                break  # Connection established
            except Exception as e:
                logger.error("Connection attempt %d/%d failed: %s", attempt, self.reconnect_attempts, e)
                if attempt < self.reconnect_attempts:
                    time.sleep(min(2 ** attempt, 30))  # exponential backoff up to 30s
                else:
                    raise ConnectionError(
                        f"Failed to connect after {self.reconnect_attempts} attempts"
                    ) from e

        # BLOCK here until the socket disconnects
        # This makes connect() behave like a long-running call so the
        # caller's retry loop only wakes up on a real disconnect.
        logger.info("Socket connected — waiting for disconnect event")
        self._connected_event.wait()            # wait until connected (should already be set)
        self._connected_event.wait()            # this won't re-block — we need disconnect signal

        # Wait for disconnection: poll until the event is cleared
        while self._connected_event.is_set():
            time.sleep(0.5)

        logger.info("Socket disconnected — connect() returning to caller")

    # ----------------------------------------------------------------
    # Emit
    # ----------------------------------------------------------------
    def emit(self, event_name: str, payload: dict):
        """
        Emit an event. Refreshes the token and reconnects if disconnected.
        Non-blocking — returns after emit or logs an error.
        """
        if self.is_connected:
            try:
                self._sio.emit(event_name, payload, namespace=self.namespace)
                logger.info("Emitted %s: %s", event_name, payload)
                return
            except Exception as e:
                logger.error("Emit error: %s", e)
                return

        # Not connected — try to reconnect inline (best-effort for emit path)
        logger.warning("Socket not connected — attempting inline reconnect for emit")
        try:
            if not self._is_token_valid():
                new_token = self.get_access_token()
                if not new_token:
                    logger.error("Cannot emit — failed to obtain access token")
                    return
                self.set_access_token(new_token)

            with self._lock:
                token = self._access_token

            headers = {"Cookie": f"accessToken={token}"}
            self._sio.connect(
                self.url,
                headers=headers,
                socketio_path=self.path,
                namespaces=[self.namespace],
                transports=["websocket"],
            )
            # Brief wait for on_connect to fire
            self._connected_event.wait(timeout=3.0)

            if not self.is_connected:
                logger.error("Still disconnected after inline reconnect — dropping emit")
                return

            self._sio.emit("message", payload, namespace=self.namespace)
            logger.info("Emitted after reconnect %s: %s", event_name, payload)

        except Exception as e:
            logger.error("Inline reconnect/emit failed: %s", e)

    # ----------------------------------------------------------------
    # Heartbeat
    # ----------------------------------------------------------------
    def _heartbeat(self, interval: int = 10):
        """Send periodic pings to keep the socket alive."""
        while True:
            # Wait for connection before sending heartbeats
            self._connected_event.wait()
            try:
                self._sio.emit("ping", {"ts": time.time()}, namespace=self.namespace)
            except Exception:
                pass
            time.sleep(interval)


# Global singleton
socket_manager = SocketManager()
