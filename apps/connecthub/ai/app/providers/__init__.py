"""
Base LLM Provider Interface for ConnectHub AI Voice System.
All AI providers (OpenAI, Gemini, Claude) implement this interface.
"""
from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    """
    Abstract base class for real-time AI voice providers.
    Each provider wraps a streaming websocket connection and
    exposes a uniform async interface for the voice controller.
    """

    def __init__(self, api_key: str, session_config: dict, on_event):
        """
        Args:
            api_key: Provider-specific API key
            session_config: Dict with model, voice, instructions, tools, etc.
            on_event: Async callback(event_type: str, event: dict)
                      called for every meaningful inbound event
        """
        self.api_key = api_key
        self.session_config = session_config
        self.on_event = on_event
        self.transcript_lines: list[str] = []  # accumulated during session

    @abstractmethod
    async def connect(self):
        """Open the WebSocket/stream to the AI provider."""
        ...

    @abstractmethod
    async def disconnect(self, is_transfer: bool = False):
        """Gracefully close the AI provider connection. Pass is_transfer=True when switching agents."""
        ...

    @abstractmethod
    async def send_audio(self, b64_audio: str):
        """
        Send a base64 chunk of audio to the provider.
        For OpenAI: g711_ulaw encoded
        For Gemini: L16 PCM encoded
        """
        ...

    @abstractmethod
    async def cancel_response(self):
        """Cancel the currently in-progress response (on user interruption)."""
        ...

    @abstractmethod
    async def trigger_response(self, instructions: str = ""):
        """
        Ask the model to generate a response.
        If instructions provided, the model should say that text first.
        OpenAI: response.create + optional instructions
        Gemini: client_content turn or system prompt injection
        """
        ...

    @abstractmethod
    async def ack_function_call(self, call_id: str, func_name: str):
        """
        Acknowledge a function/tool call so the provider knows it was handled.
        OpenAI: conversation.item.create (function_call_output)
        Gemini: tool_response message
        """
        ...

    @abstractmethod
    async def commit_audio(self):
        """
        Commit/flush buffered audio and trigger a response.
        OpenAI: input_audio_buffer.commit + response.create
        Gemini: client_content turn_complete
        """
        ...

    def needs_l16_audio(self) -> bool:
        """
        Return True if this provider expects raw L16 PCM audio.
        Used by voice controller to decide whether to run lin2ulaw conversion.
        Default: False (OpenAI uses g711_ulaw)
        """
        return False

    def get_transcript(self) -> str:
        """Return the full conversation transcript from this session."""
        return "\n".join(self.transcript_lines)

    def append_transcript(self, role: str, text: str):
        """Add a line to the running transcript."""
        if text.strip():
            self.transcript_lines.append(f"{role}: {text.strip()}")
