"""
Voice Controller — WebSocket router for multi-provider AI voice sessions.
Supports OpenAI Realtime API and Google Gemini Multimodal Live API.

Architecture:
 - FreeSWITCH / Frontend → FastAPI WebSocket → current provider (OpenAI or Gemini)
 - Providers emit normalized events into a shared asyncio.Queue
 - On agent transfer: disconnect current provider → connect new provider (same queue)
 - Transcript is accumulated and injected into the new provider's context
"""
import asyncio
import json
import uuid
import math
import struct
import base64
import time
import logging
import re

try:
    import audioop  # available Python <= 3.12
except ImportError:
    audioop = None

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from db.context import asyncSessionFactory
from services import bot_service
from providers.openai_provider import OpenAIProvider
from providers import BaseLLMProvider
# AudioGate removed — OpenAI server VAD handles turn detection;
# noise is filtered at transcript + prompt level instead.

logger = logging.getLogger("voice")

voice_router = APIRouter(tags=["Voice"])

# ── Transcript Noise Filter ──────────────────────────────────────────────────

# Patterns that indicate noise / non-speech transcripts from the STT
_NOISE_PATTERNS = re.compile(
    r"^\s*$"                            # empty / whitespace
    r"|^[\.…!?\-–—,;:]+$"               # only punctuation
    r"|^\s*\[.*\]\s*$"                   # [inaudible], [music], etc.
    r"|^\s*\(.*\)\s*$"                   # (inaudible), (coughing), etc.
    r"|^(.)(\1)+$"                       # repeated single char: "aaa", "mmm"
    r"|^(hmm|hm|uh|um|ah|oh|mhm|mm)+[.!?\s]*$"  # filler words only
)

# Minimum character length for a transcript to be considered real speech
_MIN_TRANSCRIPT_LENGTH = 3


def is_noise_transcript(text: str) -> bool:
    """Return True if the transcript looks like background noise, not directed speech."""
    cleaned = text.strip()
    if len(cleaned) < _MIN_TRANSCRIPT_LENGTH:
        return True
    if _NOISE_PATTERNS.match(cleaned.lower()):
        return True
    return False

# ─── Provider Factory ────────────────────────────────────────────────────────


def make_provider(llm_provider: str, session_config: dict, on_event) -> BaseLLMProvider:
    """Create the provider instance from a session_config dict."""
    return OpenAIProvider(
        api_key=settings.OPENAI_API_KEY,
        session_config=session_config,
        on_event=on_event,
    )


# ─── Audio Helpers ───────────────────────────────────────────────────────────

def gen_sine_wave(freq_hz: int = 440, duration_ms: int = 300, sample_rate: int = 8000) -> bytes:
    num_samples = sample_rate * duration_ms // 1000
    buf = bytearray()
    for i in range(num_samples):
        sample = int(14000 * math.sin(2 * math.pi * freq_hz * i / sample_rate))
        buf.extend(struct.pack("<h", sample))
    return bytes(buf)


# ─── Node Helpers ────────────────────────────────────────────────────────────

def build_instructions(system_prompt, kb_docs, label=None):
    base = str(system_prompt or "You are a helpful assistant.")
    if label:
        base = f"[{label}]\n" + base
    if kb_docs:
        parts = ["\n\n--- KNOWLEDGE BASE ---"]
        for doc in kb_docs:
            if isinstance(doc, dict):
                title   = str(doc.get("title", ""))
                content = str(doc.get("content", ""))
            else:
                title   = str(getattr(doc, "title", ""))
                content = str(getattr(doc, "content", ""))
            if content:
                parts.append(f"[{title}]\n{content}")
        parts.append("----------------------")
        base = base + "\n".join(parts)
    # Append noise rejection + natural speech style
    base += bot_service.BACKGROUND_VOICE_GUARD
    base += bot_service.NATURAL_SPEECH_STYLE
    return base


def get_node(nodes, node_id):
    return next((n for n in nodes if isinstance(n, dict) and n.get("id") == node_id), None)


def get_node_data(node):
    if not isinstance(node, dict):
        return {}
    data = node.get("data", {})
    return data if isinstance(data, dict) else {}


# ─── WebSocket Endpoint ──────────────────────────────────────────────────────

@voice_router.websocket("/ws/voice/{agent_id}")
async def voice_websocket_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()

    from datetime import datetime, timezone
    
    source = websocket.query_params.get("source")
    raw_stream_sid = websocket.query_params.get("streamSid")
    session_id = raw_stream_sid if raw_stream_sid else str(uuid.uuid4())
    call_started_at = datetime.now(timezone.utc)
    
    print(f"[WS] Connection from source: {source or 'frontend'} | session={session_id}")

    # 1. Receive initial config from frontend (skip for FreeSWITCH — loads from DB)
    frontend_config = {}
    if source != "freeswitch":
        try:
            config_msg = await websocket.receive_text()
            frontend_config = json.loads(config_msg)
        except Exception as e:
            print(f"[WS] Config receive error: {e}")
            await websocket.close(code=1008)
            return

    # 2. DB-first loading for real bot UUIDs
    db_config = None
    if agent_id not in ("agent_123", "preview"):
        try:
            bot_uuid = uuid.UUID(agent_id)
            Session = asyncSessionFactory()
            async with Session() as session:
                db_config = await bot_service.load_bot_for_voice_session(session, str(bot_uuid))
        except Exception as e:
            print(f"[WS] DB load skipped: {e}")

    # 3. Merge config
    if source != "freeswitch" and frontend_config:
        config = {**db_config, **frontend_config} if db_config else frontend_config
    else:
        config = db_config if db_config else frontend_config

    if not config and source == "freeswitch":
        print(f"[WS] Error: FreeSWITCH connected but no config found for {agent_id}.")
        await websocket.close(code=1008)
        return

    print(f"[WS] Config loaded | agent_id={agent_id}")

    # 4. Extract core config
    model         = str(config.get("model") or config.get("llmModel") or "gpt-4o-realtime-preview-2024-12-17")
    llm_provider  = "openai"
    voice         = str(config.get("voice") or "alloy")
    language      = str(config.get("language") or "")
    system_prompt = str(config.get("system_prompt") or config.get("prompt") or "You are a helpful assistant.")
    if language:
        system_prompt += f"\n\nIMPORTANT: You must speak strictly in {language}."

    first_message = str(config.get("first_message") or config.get("firstMessage") or "")
    agent_name    = str(config.get("name") or config.get("agentName") or "Assistant")
    global_kb     = list(config.get("kb_docs") or config.get("knowledgeBase") or [])

    # 5. Node graph
    nodes      = list(config.get("nodes") or [])
    edges      = list(config.get("edges") or [])
    start_node = get_node(nodes, "start")

    # 6. Session state
    state = {
        "current_node_id":         "start" if start_node else None,
        "voice":                   voice,
        "pending_greeting":        None,
        "pending_transfer":        False,
        "initial_greeting_fired":  False,
        "active_response_id":      None,
    }

    # Global transcript — accumulated across ALL agents for context injection on transfer
    global_transcript: list[dict] = []
    global_api_calls: list[dict] = []

    def get_time_offset() -> str:
        secs = int((datetime.now(timezone.utc) - call_started_at).total_seconds())
        mins = secs // 60
        rem_secs = secs % 60
        return f"{mins}:{rem_secs:02d}"

    # ── Per-node session config builder ──────────────────────────────────────

    def build_session_config_for_node(node_id: str, extra_context: str = "") -> dict:
        """
        Return a session_config dict for the given node.
        Reads per-node llmModel, llmProvider, voice from node data.
        Injects previous transcript as context if provided.
        """
        node = get_node(nodes, node_id)
        data = get_node_data(node)

        node_model    = str(data.get("llmModel")    or model)
        node_provider = str(data.get("llmProvider") or llm_provider)
        node_voice    = str(data.get("voice")       or voice)

        # Fallback for old saved voices not supported by Realtime API
        if node_provider.lower() == "openai" and node_voice.lower() in {"fable", "onyx", "nova"}:
            node_voice = "alloy"

        prompt = str(data.get("systemPrompt") or system_prompt)

        if extra_context:
            prompt = (
                "--- CONVERSATION CONTEXT (Previous Agent) ---\n"
                f"{extra_context}\n"
                "---------------------------------------------\n\n"
                + prompt
            )

        local_kb_raw = data.get("knowledgeBase") or []
        local_kb = [
            {"title": str(d.get("title", "")), "content": str(d.get("content", ""))}
            for d in local_kb_raw if isinstance(d, dict)
        ]
        instructions = build_instructions(prompt, global_kb + local_kb)

        # Build transfer tools for every OTHER node
        tools = []
        for n in nodes:
            n_id   = n.get("id")
            n_data = get_node_data(n)
            n_type = n_data.get("nodeType")
            n_name = str(n_data.get("label") or n_id)

            if n_id == node_id:
                continue

            if n_type == "start":
                tools.append({
                    "type": "function",
                    "name": "transfer_to_greeter",
                    "description": "Transfer the user back to the main receptionist.",
                    "parameters": {"type": "object", "properties": {}, "required": []},
                })
            elif n_type == "subagent":
                safe_id  = str(n_id).replace("-", "_")
                in_edge  = next((e for e in edges if e.get("target") == n_id), None)
                condition = (
                    str(in_edge["data"].get("llmCondition") or f"Transfer to {n_name}.")
                    if in_edge and isinstance(in_edge.get("data"), dict)
                    else f"Transfer the user to the {n_name} agent."
                )
                tools.append({
                    "type": "function",
                    "name": f"transfer_to_{safe_id}",
                    "description": condition,
                    "parameters": {"type": "object", "properties": {}, "required": []},
                })
            elif n_type == "action":
                # Only expose the action tool if there is a direct edge from THIS subagent to the action node
                safe_id = str(n_id).replace("-", "_")
                in_edge = next((e for e in edges if e.get("target") == n_id and e.get("source") == node_id), None)
                if in_edge:
                    params_str = n_data.get("apiParameters")
                    params_obj = {"type": "object", "properties": {}, "required": []}
                    if params_str:
                        try:
                            params_obj = json.loads(params_str)
                        except Exception:
                            pass
                    tools.append({
                        "type": "function",
                        "name": f"execute_{safe_id}",
                        "description": str(n_data.get("description") or f"Execute API tool {n_name}"),
                        "parameters": params_obj,
                    })

        print(f"[WS] Node '{node_id}' → provider={node_provider} model={node_model} voice={node_voice} tools={len(tools)}")

        return {
            "model":        node_model,
            "llmProvider":  node_provider,
            "voice":        node_voice,
            "instructions": instructions,
            "tools":        tools,
            "source":       source or "frontend",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.93,
                "prefix_padding_ms": 400,
                "silence_duration_ms": 700,
                "create_response": False,
            },
        }

    # ── FreeSWITCH audio pacer ────────────────────────────────────────────────

    fs_playback_queue = asyncio.Queue()
    fs_audio_buffer   = bytearray()
    fs_pacer_task     = None

    async def fs_audio_pacer():
        """Pace audio delivery to FreeSWITCH so it doesn't buffer heavily."""
        next_play_time = time.time()
        while True:
            try:
                chunk = await fs_playback_queue.get()
            except asyncio.CancelledError:
                break

            if chunk.get("action") == "STOP":
                break

            now = time.time()
            try:
                sleep_dur = float(next_play_time) - float(now) - 0.1
                if sleep_dur > 0:
                    await asyncio.sleep(sleep_dur)
            except asyncio.CancelledError:
                break

            try:
                await websocket.send_text(json.dumps(chunk["msg"]))
            except Exception:
                break

            now = time.time()
            if next_play_time < now:
                next_play_time = now
            next_play_time += chunk["size"] / 16000.0

    # ── Diagnostic test tone for FreeSWITCH ──────────────────────────────────

    if source == "freeswitch":
        print("[DIAG] Sending 300ms L16 test tone to FreeSWITCH")
        test_pcm = gen_sine_wave(440, 300, 8000)
        await websocket.send_text(json.dumps({
            "event": "media",
            "streamSid": "default",
            "media": {"payload": base64.b64encode(test_pcm).decode("utf-8")},
        }))

    # ── Build initial session config ──────────────────────────────────────────

    initial_node_id = state["current_node_id"]
    if initial_node_id and nodes:
        initial_cfg = build_session_config_for_node(initial_node_id)
    else:
        initial_cfg = {
            "model":        model,
            "llmProvider":  "openai",
            "voice":        voice,
            "instructions": build_instructions(system_prompt, global_kb),
            "tools":        [],
            "source":       source or "frontend",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.93,
                "prefix_padding_ms": 400,
                "silence_duration_ms": 700,
                "create_response": False,
            },
        }

    # ── Shared provider event queue ───────────────────────────────────────────

    provider_event_queue: asyncio.Queue = asyncio.Queue()

    async def on_provider_event(etype: str, event: dict):
        await provider_event_queue.put((etype, event))

    # ── Mutable provider reference (list used so closures can mutate it) ──────

    current_provider: list[BaseLLMProvider] = [
        make_provider(initial_cfg["llmProvider"], initial_cfg, on_provider_event)
    ]

    # ── Connect initial provider ──────────────────────────────────────────────

    try:
        await current_provider[0].connect()
    except Exception as e:
        print(f"[WS] Failed to connect to provider: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
        return

    # Start FreeSWITCH audio pacer
    if source == "freeswitch":
        fs_pacer_task = asyncio.create_task(fs_audio_pacer())

    # ─── receive_from_client ─────────────────────────────────────────────────

    # Note: Audio passes through to OpenAI unmodified.
    # Noise is handled by: server_vad (turn detection) + transcript filter + prompt guard.

    async def receive_from_client():
        nonlocal fs_pacer_task
        try:
            while True:
                provider = current_provider[0]

                if source == "freeswitch":
                    raw_msg = await websocket.receive()
                    if raw_msg.get("type") == "websocket.disconnect":
                        break

                    payload_b64 = None
                    if "text" in raw_msg and raw_msg["text"]:
                        try:
                            evt = json.loads(raw_msg["text"])
                            if evt.get("event") == "start":
                                state["stream_sid"] = evt.get("streamSid") or evt.get("stream_sid", "default")
                            elif evt.get("event") == "media":
                                raw_b64 = evt.get("media", {}).get("payload", "")
                                if raw_b64:
                                    l16_bytes = base64.b64decode(raw_b64)
                                    if audioop:
                                        # OpenAI: convert L16 → g711_ulaw
                                        ulaw_bytes  = audioop.lin2ulaw(l16_bytes, 2)
                                        payload_b64 = base64.b64encode(ulaw_bytes).decode("utf-8")
                        except Exception as e:
                            logger.debug(f"[WS] Non-JSON frame from FreeSWITCH (normal): {e}")
                            continue

                    if not payload_b64:
                        continue

                    # Audio forwarded directly — OpenAI server VAD handles turn detection

                    await provider.send_audio(payload_b64)

                else:
                    # Frontend / Browser
                    msg = await websocket.receive_text()
                    evt = json.loads(msg)
                    event_type = evt.get("event")

                    if event_type == "client_ready":
                        greeting = ""
                        if start_node:
                            greeting = str(get_node_data(start_node).get("firstMessage") or first_message)
                        if not greeting:
                            greeting = first_message

                        if greeting.strip():
                            greeting = greeting.replace("{{agent_name}}", agent_name)
                            print(f"[WS] Triggering greeting: {greeting[:60]}...")
                            await provider.trigger_response(
                                "CRITICAL INSTRUCTION: You must read the following greeting EXACTLY word-for-word as your next response. "
                                "Do NOT add any introductory words like 'Sure,' 'Hello,' or 'I can read that'. Just say the text inside the tags immediately.\n\n"
                                f"<GREETING_SCRIPT>\n{greeting}\n</GREETING_SCRIPT>"
                            )
                        else:
                            await provider.trigger_response()

                    elif event_type == "audio":
                        audio_data = evt.get("data", "")
                        await provider.send_audio(audio_data)

                    elif event_type == "commit":
                        await provider.commit_audio()

        except WebSocketDisconnect:
            print(f"[WS] Client disconnected ({'FreeSWITCH' if source == 'freeswitch' else 'Frontend'})")
        except Exception as e:
            print(f"[WS] Client receive error: {e}")

    # ─── receive_from_provider ────────────────────────────────────────────────

    async def receive_from_provider():
        nonlocal fs_pacer_task

        handled_call_ids: set = set()

        try:
            while True:
                try:
                    etype, event = await asyncio.wait_for(provider_event_queue.get(), timeout=60.0)
                except asyncio.TimeoutError:
                    # Keep alive — check if provider is still alive
                    continue

                # ─── Transfer sentinel: keep loop alive! ──────────────────
                if etype == "provider.transferring":
                    print("[WS] Provider transferring — keeping receive loop alive for new provider.")
                    continue

                provider = current_provider[0]

                # ─── Debug log (skip noisy audio events) ──────────────────
                if etype not in {
                    "response.audio.delta", "response.audio_transcript.delta",
                    "response.audio_transcript.done", "response.content_part.added",
                    "response.content_part.done", "response.output_item.added",
                    "response.output_item.done", "conversation.item.created",
                    "response.created", "input_audio_buffer.speech_started",
                    "input_audio_buffer.speech_stopped",
                }:
                    print(f"[Provider] {etype}")

                # ─── session.updated → fire pending greeting ───────────────
                if etype == "session.updated":
                    in_transfer = state.get("pending_transfer", False)
                    if in_transfer:
                        pending = state.get("pending_greeting")
                        state["pending_greeting"] = None
                        state["pending_transfer"] = False
                        if pending:
                            print(f"[WS] Firing greeting after session.updated")
                            await provider.trigger_response(pending)
                        else:
                            await provider.trigger_response()

                    elif source == "freeswitch" and not state.get("initial_greeting_fired", False):
                        state["initial_greeting_fired"] = True
                        greeting = ""
                        if start_node:
                            greeting = str(get_node_data(start_node).get("firstMessage") or first_message)
                        if not greeting:
                            greeting = first_message

                        if greeting.strip():
                            greeting = greeting.replace("{{agent_name}}", agent_name)
                            print(f"[WS] (FreeSWITCH) Triggering greeting: {greeting[:60]}...")
                            await provider.trigger_response(
                                "CRITICAL INSTRUCTION: You must read the following greeting EXACTLY word-for-word as your next response. "
                                "Do NOT add any introductory words like 'Sure,' 'Hello,' or 'I can read that'. Just say the text inside the tags immediately.\n\n"
                                f"<GREETING_SCRIPT>\n{greeting}\n</GREETING_SCRIPT>"
                            )
                        else:
                            await provider.trigger_response()

                # ─── User speech detected → stop bot audio immediately ────
                elif etype == "input_audio_buffer.speech_started":
                    # IMMEDIATELY stop bot audio for instant barge-in.
                    # We don't create a response yet — that waits for transcript
                    # validation (prevents responding to background noise).

                    # Save partial bot transcript
                    partial_text = state.get("active_assistant_text", "").strip()
                    if partial_text:
                        node = get_node(nodes, state["current_node_id"] or "")
                        curr_name = str(get_node_data(node).get("label") or agent_name) if node else agent_name
                        latency = {"llm_ms": state["last_llm_ms"]} if state.get("last_llm_ms") else None
                        global_transcript.append({
                            "role": "agent",
                            "agent_name": curr_name,
                            "text": partial_text + " ... (interrupted)",
                            "time_offset": get_time_offset(),
                            "metrics": latency
                        })
                        state["active_assistant_text"] = ""

                    # Cancel any active response generation
                    if state.get("active_response_id"):
                        await provider.cancel_response()
                    state["active_response_id"] = None

                    # Clear audio playback immediately (instant barge-in)
                    if source == "freeswitch":
                        has_pending = (not fs_playback_queue.empty()) or (len(fs_audio_buffer) > 0)
                        if has_pending:
                            fs_audio_buffer.clear()
                            stream_sid = state.get("stream_sid") or "default"
                            logger.info(f"[WS] 🛑 User interrupted (streamSid={stream_sid})")
                            await websocket.send_text(json.dumps({
                                "event": "clear",
                                "streamSid": stream_sid
                            }))
                            if fs_pacer_task and not fs_pacer_task.done():
                                fs_pacer_task.cancel()
                                try:
                                    await fs_pacer_task
                                except asyncio.CancelledError:
                                    pass
                            while not fs_playback_queue.empty():
                                try:
                                    fs_playback_queue.get_nowait()
                                except asyncio.QueueEmpty:
                                    break
                            fs_pacer_task = asyncio.create_task(fs_audio_pacer())
                            logger.info("[WS] ✅ Pacer respawned")
                    else:
                        await websocket.send_text(json.dumps({"event": "clear_audio"}))

                    # Mark that we need to create a response when transcript arrives
                    state["pending_interrupt"] = True

                # ─── User stopped speaking → start STT timer ───────────────
                elif etype == "input_audio_buffer.speech_stopped":
                    # Timer starts NOW — this is when Whisper begins processing.
                    # speech_stopped → transcription.completed = true STT latency.
                    state["speech_start_time"] = time.time()

                # ─── Track active response ─────────────────────────────────
                elif etype == "response.created":
                    state["active_response_id"] = event.get("response", {}).get("id") or "active"
                    state["response_start_time"] = time.time()
                    state["last_llm_ms"] = None
                    state["audio_start_time"] = None

                # ─── Audio delta → send to client ──────────────────────────
                elif etype == "response.audio.delta":
                    if state.get("active_response_id") != event.get("response_id"):
                        continue  # drop stale OpenAI packets
                        
                    if not state.get("last_llm_ms") and state.get("response_start_time"):
                        state["last_llm_ms"] = int((time.time() - state["response_start_time"]) * 1000)
                    if not state.get("audio_start_time"):
                        state["audio_start_time"] = time.time()

                    if source == "freeswitch":
                        b64_data = event.get("delta", "")
                        if not b64_data or not audioop:
                            continue

                        raw_bytes = base64.b64decode(b64_data)

                        # OpenAI: g711_ulaw → L16
                        l16_bytes = audioop.ulaw2lin(raw_bytes, 2)

                        fs_audio_buffer.extend(l16_bytes)
                        stream_id = state.get("stream_sid", "default")

                        while len(fs_audio_buffer) >= 320:
                            chunk_bytes = bytes(fs_audio_buffer[:320])
                            del fs_audio_buffer[:320]
                            await fs_playback_queue.put({
                                "msg": {
                                    "event": "media",
                                    "streamSid": stream_id,
                                    "media": {"payload": base64.b64encode(chunk_bytes).decode("utf-8")},
                                },
                                "size": 320,
                            })
                    else:
                        await websocket.send_text(json.dumps({
                            "event": "audio",
                            "data": event.get("delta", ""),
                        }))

                # ─── Audio done → flush buffer ─────────────────────────────
                elif etype in {"response.audio.done", "response.output_item.done"}:
                    if source == "freeswitch" and len(fs_audio_buffer) > 0:
                        chunk_bytes = bytes(fs_audio_buffer)
                        fs_audio_buffer.clear()
                        await fs_playback_queue.put({
                            "msg": {
                                "event": "media",
                                "streamSid": state.get("stream_sid", "default"),
                                "media": {"payload": base64.b64encode(chunk_bytes).decode("utf-8")},
                            },
                            "size": len(chunk_bytes),
                        })

                # ─── AI transcript delta ───────────────────────────────────
                elif etype == "response.audio_transcript.delta":
                    state["active_assistant_text"] = state.get("active_assistant_text", "") + event.get("delta", "")
                    if source != "freeswitch":
                        node = get_node(nodes, state["current_node_id"] or "")
                        curr_name = str(get_node_data(node).get("label") or agent_name) if node else agent_name
                        await websocket.send_text(json.dumps({
                            "event": "text_delta",
                            "text": event.get("delta", ""),
                            "agent": curr_name,
                        }))

                # ─── AI transcript done ────────────────────────────────────
                elif etype == "response.audio_transcript.done":
                    state["active_assistant_text"] = ""
                    full_text = str(event.get("transcript") or "")
                    if full_text.strip():
                        node = get_node(nodes, state["current_node_id"] or "")
                        curr_name = str(get_node_data(node).get("label") or agent_name) if node else agent_name
                        
                        audio_ms = None
                        if state.get("audio_start_time"):
                            audio_ms = int((time.time() - state["audio_start_time"]) * 1000)
                            state["audio_start_time"] = None
                            
                        metrics = {}
                        if state.get("last_llm_ms"):
                            metrics["llm_ms"] = state["last_llm_ms"]
                            state["last_llm_ms"] = None
                        if audio_ms:
                            metrics["audio_ms"] = audio_ms
                            
                        global_transcript.append({
                            "role": "agent",
                            "agent_name": curr_name,
                            "text": full_text.strip(),
                            "time_offset": get_time_offset(),
                            "metrics": metrics
                        })
                        
                    if source != "freeswitch":
                        await websocket.send_text(json.dumps({"event": "text_done"}))

                # ─── User speech transcript ────────────────────────────────
                elif etype == "conversation.item.input_audio_transcription.completed":
                    transcript = str(event.get("transcript") or "")
                    
                    stt_ms = None
                    if state.get("speech_start_time"):
                        stt_ms = int((time.time() - state["speech_start_time"]) * 1000)
                        state["speech_start_time"] = None

                    # ── Transcript noise filter: drop background chatter ──
                    if is_noise_transcript(transcript):
                        logger.info(f"[NOISE] Dropped noise transcript: {repr(transcript[:60])}")
                        # Don't create a response for noise
                        state["pending_interrupt"] = False
                        continue

                    # Reset interrupt flag
                    state["pending_interrupt"] = False

                    # Manually trigger response (since create_response=false in VAD)
                    if transcript.strip():
                        await provider.trigger_response()
                        
                    if transcript.strip():
                        global_transcript.append({
                            "role": "user",
                            "text": transcript.strip(),
                            "time_offset": get_time_offset(),
                            "metrics": {"stt_ms": stt_ms} if stt_ms else {}
                        })
                        
                        if source != "freeswitch":
                            await websocket.send_text(json.dumps({
                                "event": "user_text",
                                "text": transcript,
                            }))

                # ─── Tool / Transfer call ──────────────────────────────────
                elif etype in ("response.function_call_arguments.done", "response.done"):
                    func_name = ""
                    call_id   = ""

                    if etype == "response.function_call_arguments.done":
                        func_name = str(event.get("name") or "")
                        call_id   = str(event.get("call_id") or "")
                    else:
                        output = event.get("response", {}).get("output", [])
                        func_calls = [o for o in output if isinstance(o, dict) and o.get("type") == "function_call"]
                        if not func_calls:
                            continue
                        func_name = str(func_calls[0].get("name") or "")
                        call_id   = str(func_calls[0].get("call_id") or "")

                    if call_id in handled_call_ids:
                        continue
                    if call_id:
                        handled_call_ids.add(call_id)

                    if func_name.startswith("execute_"):
                        # Custom API Action Hook
                        print(f"[WS] ⚡ API Action requested: {func_name}")
                        raw_target = str(func_name)[len("execute_"):]
                        target_node = next(
                            (n for n in nodes if isinstance(n, dict) and
                             str(n.get("id", "")).replace("-", "_") == raw_target),
                            None,
                        )
                        
                        kwargs = {}
                        if etype == "response.function_call_arguments.done":
                            try:
                                kwargs = json.loads(event.get("arguments", "{}"))
                            except Exception:
                                pass
                        else:
                            try:
                                o_calls = [o for o in event.get("response", {}).get("output", []) if isinstance(o, dict) and o.get("type") == "function_call"]
                                if o_calls:
                                    kwargs = json.loads(o_calls[0].get("arguments", "{}"))
                            except Exception:
                                pass

                        result_body = {"error": "Target action node not found in graph."}
                        if target_node:
                            target_data = get_node_data(target_node)
                            api_url = target_data.get("apiUrl")
                            api_method = target_data.get("apiMethod", "GET").upper()
                            
                            if not api_url:
                                result_body = {"error": "API URL is not configured for this action."}
                            else:
                                print(f"[WS]   → Sending {api_method} {api_url} with payload {kwargs}")
                                # Parse custom headers from node config
                                custom_headers = {}
                                headers_str = target_data.get("apiHeaders")
                                if headers_str:
                                    try:
                                        custom_headers = json.loads(headers_str)
                                    except Exception:
                                        pass
                                try:
                                    import urllib.request
                                    import urllib.parse

                                    def _do_http():
                                        if api_method == "POST":
                                            data = json.dumps(kwargs).encode("utf-8")
                                            req = urllib.request.Request(api_url, data=data, method="POST")
                                            req.add_header("Content-Type", "application/json")
                                        else:
                                            qs = urllib.parse.urlencode(kwargs) if kwargs else ""
                                            full_url = f"{api_url}?{qs}" if qs else api_url
                                            req = urllib.request.Request(full_url, method="GET")
                                        # Apply custom auth/headers
                                        for h_key, h_val in custom_headers.items():
                                            req.add_header(h_key, h_val)
                                        with urllib.request.urlopen(req, timeout=10) as resp:
                                            return resp.read().decode("utf-8")

                                    r_text = await asyncio.to_thread(_do_http)
                                    try:
                                        result_body = json.loads(r_text)
                                    except Exception:
                                        result_body = {"response": r_text}
                                        
                                    global_api_calls.append({
                                        "action": raw_target,
                                        "endpoint": api_url,
                                        "method": api_method,
                                        "status": "success",
                                        "request": kwargs,
                                        "response": result_body,
                                        "timestamp": datetime.now(timezone.utc).isoformat()
                                    })
                                except Exception as e:
                                    print(f"[WS]   → ❌ Action HTTP Error: {e}")
                                    result_body = {"error": f"Failed to execute webhook: {str(e)}"}
                                    global_api_calls.append({
                                        "action": raw_target,
                                        "endpoint": api_url,
                                        "method": api_method,
                                        "status": "error",
                                        "request": kwargs,
                                        "response": {"error": str(e)},
                                        "timestamp": datetime.now(timezone.utc).isoformat()
                                    })
                        
                        print(f"[WS]   → Providing JSON result to AI context: {str(result_body)[:100]}...")
                        # Feed the JSON Database result back to OpenAI seamlessly!
                        await provider.ack_function_call(call_id, func_name, json.dumps(result_body))
                        await provider.trigger_response()
                        continue

                    if not func_name.startswith("transfer_to_"):
                        continue

                    print(f"[WS] Transfer requested: {func_name}")

                    # Ack the function call to the current provider
                    await provider.ack_function_call(call_id, func_name)

                    # Cancel current response
                    if state.get("active_response_id"):
                        await provider.cancel_response()
                    state["active_response_id"] = None

                    # Resolve target node
                    if func_name == "transfer_to_greeter":
                        target_node = start_node
                    else:
                        raw_target = str(func_name)[len("transfer_to_"):]
                        target_node = next(
                            (n for n in nodes if isinstance(n, dict) and
                             str(n.get("id", "")).replace("-", "_") == raw_target),
                            None,
                        )

                    if not target_node:
                        print(f"[WS] Transfer target not found: {func_name}")
                        await provider.trigger_response()
                        continue

                    target_id    = str(target_node.get("id", ""))
                    target_data  = get_node_data(target_node)
                    target_label = str(target_data.get("label") or target_id)
                    print(f"[WS] Transferring → '{target_label}' ({target_id})")

                    # Build config for target node with full transcript context
                    current_transcript = "\n".join([
                        f"{item['role'].capitalize()}: {item['text']}" 
                        if isinstance(item, dict) else item 
                        for item in global_transcript
                    ])
                    target_cfg = build_session_config_for_node(target_id, extra_context=current_transcript)

                    # ── Transfer: forced reconnect to apply all settings ──
                    # (OpenAI rejects voice changes mid-session if audio has played)
                    print(f"[WS] Agent transfer reconnecting...")
                    await provider.disconnect(is_transfer=True)
                    new_provider = make_provider("openai", target_cfg, on_provider_event)
                    current_provider[0] = new_provider
                    await new_provider.connect()

                    state["current_node_id"] = target_id
                    state["voice"] = target_cfg["voice"]

                    # Set up greeting for session.updated handler
                    target_greeting = str(target_data.get("firstMessage") or "")
                    if target_id == "start" and not target_greeting:
                        target_greeting = first_message

                    if target_greeting.strip():
                        target_greeting = target_greeting.replace("{{agent_name}}", agent_name)
                        state["pending_greeting"] = (
                            "CRITICAL INSTRUCTION: You must read the following greeting EXACTLY word-for-word as your next response. "
                            "Do NOT add any introductory words like 'Sure,' 'Hello,' or 'I can read that'. Just say the text inside the tags immediately.\n\n"
                            f"<GREETING_SCRIPT>\n{target_greeting}\n</GREETING_SCRIPT>"
                        )
                    else:
                        state["pending_greeting"] = None

                    state["pending_transfer"] = True

                    # Notify frontend of agent change
                    if source != "freeswitch":
                        await websocket.send_text(json.dumps({
                            "event": "agent_changed",
                            "agent_name": target_label,
                            "provider": "openai",
                        }))

                # ─── Error ────────────────────────────────────────────────
                elif etype == "error":
                    error_code = event.get("error", {}).get("code")
                    if error_code == "response_cancel_not_active":
                        print(f"[Provider] Harmless cancel error: {error_code}")
                    else:
                        print(f"[Provider Error] {event}")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[WS] Provider receive error: {e}")

    # ── Run both tasks ────────────────────────────────────────────────────────

    client_task   = asyncio.create_task(receive_from_client())
    provider_task = asyncio.create_task(receive_from_provider())

    done, pending = await asyncio.wait(
        [client_task, provider_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    if client_task in done and source == "freeswitch":
        print("[WS] Client finished. Waiting for provider audio to drain...")
        try:
            await asyncio.wait_for(provider_task, timeout=5.0)
        except asyncio.TimeoutError:
            print("[WS] Provider task timed out after client disconnect.")
            provider_task.cancel()
            await asyncio.gather(provider_task, return_exceptions=True)
    else:
        reason = "Client" if client_task in done else "Provider"
        print(f"[WS] Session closing for {agent_id}. Reason: {reason} finished first.")
        for task in pending:
            task.cancel()
        try:
            await asyncio.gather(*pending, return_exceptions=True)
        except Exception:
            pass

    # Always clean up pacer task
    if source == "freeswitch" and fs_pacer_task and not fs_pacer_task.done():
        print("[WS] Cleaning up pacer task.")
        fs_pacer_task.cancel()
        try:
            await fs_pacer_task
        except asyncio.CancelledError:
            pass

    # Disconnect provider
    try:
        await current_provider[0].disconnect()
    except Exception:
        pass

    # Save Call Record and Transcript
    if len(global_transcript) > 0 and agent_id not in ("agent_123", "preview"):
        call_ended_at = datetime.now(timezone.utc)
        duration_sec = int((call_ended_at - call_started_at).total_seconds())

        caller_number = websocket.query_params.get("fromNumber") or state.get("caller_number") or "Unknown"
        if source != "freeswitch":
            caller_number = "Frontend User"

        async def save_and_summarize():
            try:
                from models.dto import CallRecordCreateRequest
                from repos import phone_call_repo
                
                # Create the call record
                Session = asyncSessionFactory()
                async with Session() as db_session:
                    req = CallRecordCreateRequest(
                        bot_id=agent_id,
                        call_uuid=session_id,
                        started_at=call_started_at,
                        ended_at=call_ended_at,
                        duration_sec=duration_sec,
                        transcript=global_transcript,
                        source=source or "frontend",
                        caller_number=caller_number,
                        status="completed" if duration_sec > 5 else "interrupted",
                        end_reason="completed",
                        api_calls=global_api_calls,
                    )
                    await phone_call_repo.create_call_record(db_session, req)
                    print(f"[WS] 💾 Saved call record {session_id} to DB. Length: {duration_sec}s")

                # Generate summary via standard OpenAI Chat API
                import urllib.request
                import urllib.parse
                
                def _do_summary():
                    api_key = settings.OPENAI_API_KEY
                    if not api_key:
                        return None
                        
                    messages = [
                        {"role": "system", "content": "You are a helpful assistant that summarizes call transcripts. Keep it concise, professional, and max 3-4 sentences. Highlight any key actions or issues."},
                        {"role": "user", "content": "Here is the transcript:\n\n" + "\n".join([f"{item['role'].capitalize()}: {item['text']}" for item in global_transcript if isinstance(item, dict)])}
                    ]
                    
                    data = json.dumps({
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "temperature": 0.3
                    }).encode("utf-8")
                    
                    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=data, method="POST")
                    req.add_header("Content-Type", "application/json")
                    req.add_header("Authorization", f"Bearer {api_key}")
                    
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        return res_data["choices"][0]["message"]["content"]
                        
                # Run the synchronous API call in a thread
                summary_text = await asyncio.to_thread(_do_summary)
                
                if summary_text:
                    async with Session() as db_session:
                        await phone_call_repo.update_call_summary(db_session, session_id, summary_text)
                    print(f"[WS] 📝 Generated & saved summary for {session_id}")
            except Exception as e:
                print(f"[WS] ❌ Error saving call record / summary: {e}")

        # Run in background to let WS close cleanly
        asyncio.create_task(save_and_summarize())
