"""
OpenAI Realtime API Provider for ConnectHub AI Voice System.
Wraps the OpenAI WSS realtime endpoint with the BaseLLMProvider interface.
"""
import json
import asyncio
import logging
import websockets
from providers import BaseLLMProvider

logger = logging.getLogger("openai_provider")

# Audio format constants
# g711_ulaw  = native 8kHz  (FreeSWITCH telephony)
# pcm16      = native 24kHz (Browser / frontend)
FS_FORMAT       = "g711_ulaw"
FRONTEND_FORMAT = "pcm16"


class OpenAIProvider(BaseLLMProvider):
    """
    Connects to wss://api.openai.com/v1/realtime using the OpenAI
    Realtime API. Streams audio in/out and emits normalized events
    via on_event callback.
    """

    NORMALIZED_EVENTS = {
        "response.audio.delta",
        "response.audio.done",
        "response.created",
        "response.done",
        "response.audio_transcript.delta",
        "response.audio_transcript.done",
        "response.function_call_arguments.done",
        "conversation.item.input_audio_transcription.completed",
        "input_audio_buffer.speech_started",
        "input_audio_buffer.speech_stopped",
        "input_audio_buffer.committed",
        "session.updated",
        "error",
    }

    def __init__(self, api_key: str, session_config: dict, on_event):
        BaseLLMProvider.__init__(self, api_key, session_config, on_event)
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._recv_task: asyncio.Task | None = None

    # ── Connection ──────────────────────────────────────────────────────────

    async def connect(self):
        model = self.session_config.get("model", "gpt-4o-realtime-preview-2024-12-17")
        url = f"wss://api.openai.com/v1/realtime?model={model}"
        headers = [
            ("Authorization", f"Bearer {self.api_key}"),
            ("OpenAI-Beta", "realtime=v1"),
        ]
        self._ws = await websockets.connect(url, additional_headers=headers)
        logger.info(f"[OpenAI] Connected → model={model}")

        # Send initial session config
        await self._ws.send(json.dumps(self._build_session_payload()))

        # Start background receiver
        self._recv_task = asyncio.create_task(self._receive_loop())

    async def disconnect(self, is_transfer: bool = False):
        self._is_transfer = is_transfer
        ws_to_close = self._ws
        self._ws = None  # Prevent new send_audio calls immediately
        if self._recv_task:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except asyncio.CancelledError:
                pass
        if ws_to_close:
            try:
                await ws_to_close.close()
            except Exception:
                pass
        # Signal controller whether this was an intentional transfer
        if is_transfer:
            await self.on_event("provider.transferring", {})
        logger.info("[OpenAI] Disconnected")

    # ── Audio ────────────────────────────────────────────────────────────────

    def needs_l16_audio(self) -> bool:
        """FreeSWITCH sends L16 PCM which must be converted to g711_ulaw.
        Frontend sends pcm16 directly — no conversion needed."""
        return False

    async def send_audio(self, b64_audio: str):
        """Send base64 audio chunk to OpenAI (format depends on source)."""
        if self._ws:
            try:
                await self._ws.send(json.dumps({
                    "type": "input_audio_buffer.append",
                    "audio": b64_audio,
                }))
            except Exception:
                pass

    async def commit_audio(self):
        """Commit buffered audio and trigger response (frontend push-to-talk mode)."""
        if self._ws:
            try:
                await self._ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
                await self._ws.send(json.dumps({"type": "response.create"}))
            except Exception:
                pass

    # ── Control ──────────────────────────────────────────────────────────────

    async def cancel_response(self):
        if self._ws:
            try:
                await self._ws.send(json.dumps({"type": "response.cancel"}))
            except Exception:
                pass

    async def trigger_response(self, instructions: str = ""):
        """Ask OpenAI to generate a response, optionally with specific instructions."""
        if not self._ws:
            return
        payload: dict = {"type": "response.create"}
        if instructions:
            payload["response"] = {"instructions": instructions}
        try:
            await self._ws.send(json.dumps(payload))
        except Exception:
            pass

    async def ack_function_call(self, call_id: str, func_name: str, output_str: str = None):
        """Acknowledge a function call output so OpenAI can continue."""
        if self._ws:
            payload_str = output_str if output_str is not None else json.dumps({"status": "Transfer successful."})
            await self._ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": payload_str,
                },
            }))

    async def send_raw(self, payload: dict):
        """Send any raw JSON payload to OpenAI."""
        if self._ws:
            await self._ws.send(json.dumps(payload))

    async def update_session(self, session_cfg: dict):
        """Push a session.update with new instructions/voice/tools."""
        if not self._ws:
            return
        await self._ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["audio", "text"],
                "instructions": session_cfg.get("instructions", ""),
                "voice": session_cfg.get("voice", "alloy"),
                "input_audio_format": self._audio_format(),
                "output_audio_format": self._audio_format(),
                "input_audio_transcription": {"model": "gpt-4o-mini-transcribe"},
                "tools": session_cfg.get("tools", []),
                "tool_choice": "auto",
                "turn_detection": session_cfg.get("turn_detection", {
                    "type": "server_vad",
                    "threshold": 0.92,
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 700,
                }),
            },
        }))

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _receive_loop(self):
        try:
            async for message in self._ws:
                event = json.loads(message)
                etype = event.get("type", "")

                # Accumulate transcript internally
                if etype == "response.audio_transcript.delta":
                    text = event.get("delta", "")
                    if text:
                        if self.transcript_lines and self.transcript_lines[-1].startswith("Assistant:"):
                            self.transcript_lines[-1] += text
                        else:
                            self.transcript_lines.append(f"Assistant: {text}")
                elif etype == "conversation.item.input_audio_transcription.completed":
                    transcript = event.get("transcript", "")
                    if transcript:
                        self.transcript_lines.append(f"User: {transcript}")

                # Forward normalized events to controller
                if etype in self.NORMALIZED_EVENTS:
                    await self.on_event(etype, event)

        except websockets.exceptions.ConnectionClosed:
            logger.info("[OpenAI] Connection closed")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[OpenAI] Receive error: {e}")

    def _build_session_payload(self) -> dict:
        cfg = self.session_config
        return {
            "type": "session.update",
            "session": {
                "modalities": ["audio", "text"],
                "instructions": cfg.get("instructions", "You are a helpful assistant."),
                "voice": cfg.get("voice", "alloy"),
                "input_audio_format": self._audio_format(),
                "output_audio_format": self._audio_format(),
                "input_audio_transcription": {"model": "gpt-4o-mini-transcribe"},
                "tools": cfg.get("tools", []),
                "tool_choice": "auto",
                "turn_detection": cfg.get("turn_detection", {
                    "type": "server_vad",
                    "threshold": 0.92,
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 700,
                }),
            },
        }

    def _audio_format(self) -> str: 
        """Return the audio format based on the session source."""
        source = self.session_config.get("source", "frontend")
        return FS_FORMAT if source == "freeswitch" else FRONTEND_FORMAT
