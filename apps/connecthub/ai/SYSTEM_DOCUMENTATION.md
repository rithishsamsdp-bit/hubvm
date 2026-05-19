# ConnectHub AI Voice System — Technical Documentation

> **Version:** 1.0 | **Date:** March 2026 | **Classification:** Internal + Customer-Facing

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Connection Sources & Entry Points](#3-connection-sources--entry-points)
4. [Audio Pipeline — Full Flow](#4-audio-pipeline--full-flow)
5. [WebSocket Events Reference](#5-websocket-events-reference)
6. [AI Agent Configuration](#6-ai-agent-configuration)
7. [Multi-Agent (Node Graph) System](#7-multi-agent-node-graph-system)
8. [Interruption Handling](#8-interruption-handling)
9. [FreeSWITCH Integration Details](#9-freeswitch-integration-details)
10. [Frontend (Browser) Integration](#10-frontend-browser-integration)
11. [Session Lifecycle](#11-session-lifecycle)
12. [Error Handling & Cleanup](#12-error-handling--cleanup)
13. [Key Technical Decisions](#13-key-technical-decisions)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

ConnectHub AI is a **real-time voice AI platform** that bridges telephony infrastructure (FreeSWITCH) and browser-based clients with OpenAI's Realtime API. It enables businesses to deploy intelligent voice agents that can:

- **Answer phone calls** and respond in real-time with AI-generated speech
- **Understand spoken language** and interrupt naturally when users speak
- **Transfer callers** seamlessly between specialized AI agents (sales, support, etc.)
- **Speak in multiple languages** based on agent configuration
- **Read from a customizable knowledge base** to answer domain-specific questions
- **Play custom greetings** on every agent entry

The system supports two simultaneous modes of operation: **telephony** (via FreeSWITCH) and **browser preview** (via frontend WebSocket), using the same backend engine.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ConnectHub Backend (FastAPI)                 │
│                                                                  │
│   WebSocket: /ws/voice/{agent_id}?source=freeswitch|frontend    │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  receive_from_   │    │      receive_from_openai()       │   │
│  │  client()        │◄──►│                                  │   │
│  │                  │    │  - Handles all OpenAI events     │   │
│  │  - Reads audio   │    │  - Manages agent state           │   │
│  │    from FS/FE    │    │  - Triggers transfers            │   │
│  │  - Pushes to     │    │  - Streams audio back            │   │
│  │    OpenAI        │    │                                  │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
│                                      │                           │
│                             ┌────────▼────────┐                  │
│                             │  fs_audio_pacer │ (FS only)        │
│                             │  asyncio.Task   │                  │
│                             │  - 20ms pacing  │                  │
│                             │  - Queue-based  │                  │
│                             └────────┬────────┘                  │
└──────────────────────────────────────┼──────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                         ▼
    ┌──────────────────┐   ┌─────────────────────┐  ┌─────────────────┐
    │   FreeSWITCH     │   │  OpenAI Realtime API │  │  Browser Client │
    │  mod_audio_stream│   │  wss://api.openai.   │  │  (Frontend)     │
    │  Twilio protocol │   │  com/v1/realtime     │  │  React/JS App   │
    └──────────────────┘   └─────────────────────┘  └─────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | FastAPI (Python 3.11) |
| Real-time Transport | WebSockets (RFC 6455) |
| AI Engine | OpenAI Realtime API (`gpt-4o-realtime-preview`) |
| Telephony | FreeSWITCH + `mod_audio_stream` |
| Audio Codec | G.711 µ-law (8000Hz) ↔ L16 PCM (16-bit, 8000Hz) |
| Audio Conversion | Python `audioop` library |
| Database | PostgreSQL (async SQLAlchemy) |
| Async Runtime | Python `asyncio` |

---

## 3. Connection Sources & Entry Points

### WebSocket Endpoint
```
GET ws://<server>/ws/voice/{agent_id}?source=<freeswitch|frontend>
```

The system detects which type of client is connecting via the `source` query parameter:

### 3.1 FreeSWITCH (Telephony)
- **Source:** `?source=freeswitch`
- **Protocol:** Twilio Media Stream JSON format (same as Twilio's WebSocket API)
- **Who uses it:** FreeSWITCH `mod_audio_stream` for live phone calls
- **Audio Format:** L16 PCM, 8000Hz, 16-bit, mono (base64 encoded)
- **Config:** Always loaded from database (agent_id = bot UUID)

### 3.2 Frontend Browser
- **Source:** `?source=frontend` (or omitted)
- **Protocol:** Custom ConnectHub frontend JSON events
- **Who uses it:** The React web application for live preview/testing
- **Audio Format:** g711_ulaw base64 (browser MediaRecorder output)
- **Config:** Loaded from DB, then overridden by live frontend config (for real-time preview editing)

### Config Priority
```
FreeSWITCH:  DB config only
Frontend:    DB config + live frontend override (frontend wins)
```

---

## 4. Audio Pipeline — Full Flow

### 4.1 Inbound (User Voice → OpenAI)

```
📞 User speaks on phone
         │
         ▼
FreeSWITCH microphone captures PCM audio
         │
         ▼
mod_audio_stream sends Twilio JSON event:
{"event":"media","streamSid":"...","media":{"payload":"<base64 L16 PCM>"}}
         │
         ▼
[Python Backend] receive_from_client()
  1. Decode base64 → raw L16 PCM bytes
  2. audioop.lin2ulaw(l16_bytes, 2) → G.711 µ-law bytes
  3. Re-encode to base64
         │
         ▼
OpenAI Realtime API (input_audio_buffer.append)
  → Whisper transcription (async)
  → GPT-4o processes + generates response
```

### 4.2 Outbound (AI Response → FreeSWITCH Speaker)

```
OpenAI Realtime API streams response.audio.delta events
Each delta = ~variable bytes of G.711 µ-law audio (base64)
         │
         ▼
[Python Backend] receive_from_openai() processes each delta:
  1. base64.b64decode() → µ-law bytes
  2. audioop.ulaw2lin(ulaw_bytes, 2) → L16 PCM bytes
  3. Append to fs_audio_buffer (bytearray)
         │
         ▼
Slice buffer into EXACT 320-byte (20ms) chunks:
  while len(fs_audio_buffer) >= 320:
      chunk = fs_audio_buffer[:320]
      del fs_audio_buffer[:320]
      Put chunk into fs_playback_queue
         │
         ▼
[fs_audio_pacer task] reads from queue:
  1. Calculates real-time playback schedule
  2. Sleeps Python-side to prevent FreeSWITCH over-buffering
  3. Sends to FreeSWITCH as Twilio media event:
     {"event":"media","streamSid":"...","media":{"payload":"<base64 L16>"}}
         │
         ▼
FreeSWITCH mod_audio_stream receives 320-byte frames
  → write_frame: datalen=320 samples=160 rate=8000 channels=1
         │
         ▼
📢 User hears AI voice on phone
```

### 4.3 Why 20ms Fixed Chunks?

| Parameter | Value | Reason |
|-----------|-------|--------|
| Audio format | L16 PCM, 8000Hz, 16-bit, mono | FreeSWITCH native format |
| Bytes per second | 16,000 bytes/sec | 8000 samples × 2 bytes |
| One frame | 320 bytes | 8000 Hz × 2 bytes × 0.020s |
| Frame duration | **20ms** | ITU-T G.711 standard telephony frame |

**Benefits of strict 20ms chunking:**
- 🎧 No micro-stutters (uniform buffer consumption in FreeSWITCH)
- ⚡ Instant interruption (pacer's `asyncio.sleep` escape is only max 20ms)
- 📞 Standard telephony feel (matches G.711 codec frame timing)
- 🛡️ Prevents FreeSWITCH from caching 10+ seconds of audio ahead

---

## 5. WebSocket Events Reference

### 5.1 Events: Frontend → Backend

| Event | Payload | Description |
|-------|---------|-------------|
| `client_ready` | — | Client connected, ready for greeting |
| `audio` | `{event: "audio", data: "<base64>"}` | User microphone audio chunk |
| `commit` | `{event: "commit"}` | Force submit audio buffer to OpenAI |

### 5.2 Events: Backend → Frontend (Browser)

| Event | Payload | Description |
|-------|---------|-------------|
| `audio` | `{event: "audio", data: "<base64 ulaw>"}` | AI voice audio chunk |
| `text_delta` | `{event: "text_delta", agent: "...", text: "..."}` | Streaming AI transcript |
| `agent_changed` | `{event: "agent_changed", agent_name: "..."}` | Agent transfer notification |
| `clear_audio` | `{event: "clear_audio"}` | Stop playing audio (user interrupted) |

### 5.3 Events: FreeSWITCH → Backend (Twilio Protocol)

| Event | Payload | Description |
|-------|---------|-------------|
| `start` | `{event: "start", streamSid: "<uuid>", ...}` | Stream session established. Captures `streamSid` |
| `media` | `{event: "media", media: {payload: "<base64 L16>"}}` | User audio data |
| `stop` | `{event: "stop"}` | Call ended / stream closed |

### 5.4 Events: Backend → FreeSWITCH (Twilio Protocol)

| Event | Payload | Description |
|-------|---------|-------------|
| `media` | `{event: "media", streamSid: "<uuid>", media: {payload: "<base64 L16>"}}` | AI audio frame (20ms, 320 bytes) |
| `clear` | `{event: "clear", streamSid: "<uuid>"}` | Stop playback immediately (user interrupted) |

### 5.5 OpenAI Realtime API Events Handled

| OpenAI Event | Action Taken |
|-------------|-------------|
| `session.updated` | Confirms session ready; fires initial greeting or post-transfer greeting |
| `response.created` | Captures `response.id` as `active_response_id` |
| `response.audio.delta` | Converts µ-law → L16, enqueues into 20ms chunks for FreeSWITCH; sends raw to browser |
| `response.audio.done` | Flushes any remaining bytes in `fs_audio_buffer` to the queue |
| `response.audio_transcript.delta` | Streams transcript text to browser frontend |
| `response.function_call_arguments.done` | Processes agent transfer (`transfer_to_<agent>` function calls) |
| `input_audio_buffer.speech_started` | User interruption detected — triggers `clear` to FreeSWITCH, cancels OpenAI response |
| `input_audio_buffer.committed` | Audio submitted to OpenAI model |
| `error` | Logged with full error payload |

---

## 6. AI Agent Configuration

### 6.1 Config Parameters

| Parameter | DB Key | Frontend Key | Description |
|-----------|--------|--------------|-------------|
| Model | `model` | `model` | OpenAI model ID (default: `gpt-4o-realtime-preview`) |
| Voice | `voice` | `voice` | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| System Prompt | `system_prompt` or `prompt` | `system_prompt` | Main AI instructions |
| Language | `language` | `language` | Forces the AI to respond strictly in this language |
| First Message | `first_message` or `firstMessage` | `firstMessage` | Greeting the AI reads on first connection |
| Agent Name | `name` or `agentName` | `name` | Label shown in frontend transcript |
| Knowledge Base | `kb_docs` or `knowledgeBase` | `knowledgeBase` | Array of `{title, content}` documents for RAG |

### 6.2 Knowledge Base (RAG)

The system supports per-agent and per-node knowledge bases:

```
Global KB (root bot) + Node KB (current agent) → merged into AI instructions
```

Each document is embedded directly into the system prompt:
```
--- KNOWLEDGE BASE ---
[Product FAQ]
Q: What is your return policy?...
[Pricing]
Our standard plan starts at...
----------------------
```

### 6.3 OpenAI Session Configuration

Every OpenAI session is configured with:

```json
{
  "session": {
    "modalities": ["audio", "text"],
    "input_audio_format": "g711_ulaw",
    "output_audio_format": "g711_ulaw",
    "input_audio_transcription": {"model": "whisper-1"},
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.7,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    }
  }
}
```

**VAD (Voice Activity Detection):** OpenAI's server-side VAD detects when the user starts and stops speaking, enabling natural conversation flow.

---

## 7. Multi-Agent (Node Graph) System

### 7.1 Concept

The system supports a **Visual Workflow Graph** where each node represents a specialized AI agent:

```
[Start / Receptionist]
         │                    │
         ▼                    ▼
   [Sales Agent]       [Support Agent]
                              │
                              ▼
                       [Billing Agent]
```

Each node has its own:
- **System Prompt** — specialized instructions
- **Knowledge Base** — domain-specific documents
- **First Message / Greeting** — played when a user is transferred in

### 7.2 Transfer Tools

When a session starts on a node, the system **automatically generates transfer tools** for all other reachable nodes:

```python
# For Sales Agent, auto-generates:
tools = [
  {"name": "transfer_to_greeter",   "description": "Transfer to main receptionist"},
  {"name": "transfer_to_support_abc123", "description": "Transfer to Support Agent"},
]
```

The tool **description comes from the edge's `llmCondition`** — the AI uses this to decide *when* to transfer:
- Example: `"When the user asks about pricing or wants to buy, transfer to sales."`

### 7.3 Transfer Flow

```
1. User: "I need help with my invoice"
2. AI (Receptionist node) decides to call: transfer_to_billing_xyz
3. Backend receives: response.function_call_arguments.done
4. Backend identifies target node from function name
5. Sends: session.update → new system prompt + KB for Billing Agent
6. After session.updated: fires GREETING_SCRIPT for Billing Agent
7. User now hears: "Hi! I'm your Billing specialist..."
```

---

## 8. Interruption Handling

This is the most technically complex part of the system, requiring coordination across three layers.

### 8.1 Sequence

```
1. User starts speaking mid-sentence
   └► FreeSWITCH VAD → OpenAI server VAD detects speech
   
2. OpenAI emits: input_audio_buffer.speech_started
   
3. Backend sends to OpenAI: response.cancel
   └► OpenAI stops generating new audio
   
4. Backend checks: was_speaking flag
   └► If bot WAS speaking (active_response_id ≠ null):
   
5. Backend sends to FreeSWITCH: {"event":"clear","streamSid":"..."}
   └► FreeSWITCH immediately empties its audio buffer
   
6. Backend cancels fs_pacer_task (asyncio.Task.cancel())
   └► Escapes any pending asyncio.sleep() instantly
   
7. Python fs_playback_queue is purged (all queued chunks dropped)
   
8. fs_audio_buffer (bytearray) is cleared
   
9. A fresh fs_pacer_task is spawned
   
10. active_response_id = None (stale audio deltas discarded)
```

### 8.2 Stale Audio Delta Protection

Even after cancellation, OpenAI may send a few more `response.audio.delta` packets (in-flight). The system uses `active_response_id` to discard these:

```python
# In response.audio.delta handler:
if state["active_response_id"] != event["response_id"]:
    continue  # Silently drop — belongs to cancelled response
```

### 8.3 Impact

| Without Interruption Fix | With Interruption Fix |
|-------------------------|----------------------|
| Bot talks for 5-10 seconds after user speaks | Bot stops within ~100ms |
| FreeSWITCH buffers entire AI response | FreeSWITCH never buffers more than ~100ms |
| Call feels robotic and unnatural | Natural conversational feel |

---

## 9. FreeSWITCH Integration Details

### 9.1 Lua Script (`ivrFlowv3.lua`)

The FreeSWITCH Lua IVR script:
- Reads routing configuration from `routing_configv3.json`
- Determines call routing based on time rules, menu selections, caller CLI
- Launches `mod_audio_stream` to connect the call to the AI backend
- Passes the correct `agent_id` to the WebSocket

### 9.2 Audio Codec Bridge

FreeSWITCH natively uses **L16 PCM** (16-bit linear) at 8000Hz:

```
FreeSWITCH L16@8kHz  ←→  Python audioop  ←→  OpenAI G.711 µ-law@8kHz
```

Both formats are at 8000Hz — **no resampling needed**. Only codec conversion:
- **Inbound:** `audioop.lin2ulaw(l16_bytes, sample_width=2)` 
- **Outbound:** `audioop.ulaw2lin(ulaw_bytes, sample_width=2)`

### 9.3 Diagnostic Test Tone

On every FreeSWITCH connection, the backend immediately sends a 300ms 440Hz sine wave test tone to verify the audio write path is working before any user interaction.

### 9.4 `streamSid` Tracking

When FreeSWITCH sends a `start` event, the backend captures `streamSid`:
```python
state["stream_sid"] = evt.get("streamSid") or evt.get("stream_sid", "default")
```
This ID is required in every `media` and `clear` event sent back to FreeSWITCH.

---

## 10. Frontend (Browser) Integration

### 10.1 Connection Flow

```javascript
// 1. Open WebSocket
const ws = new WebSocket(`wss://<server>/ws/voice/<agent_id>`);

// 2. On open, send agent config
ws.onopen = () => {
    ws.send(JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        system_prompt: "You are a sales assistant...",
        first_message: "Hello! How can I help you today?",
        nodes: [...],  // workflow graph
        edges: [...],
    }));
};

// 3. Signal ready to receive greeting
ws.send(JSON.stringify({ event: "client_ready" }));

// 4. Stream microphone audio
ws.send(JSON.stringify({ event: "audio", data: "<base64_ulaw>" }));

// 5. Handle incoming events
ws.onmessage = (msg) => {
    const event = JSON.parse(msg.data);
    if (event.event === "audio") { /* Play AI audio */ }
    if (event.event === "text_delta") { /* Show transcript */ }
    if (event.event === "agent_changed") { /* Update UI */ }
    if (event.event === "clear_audio") { /* Stop audio playback */ }
};
```

### 10.2 Live Config Override

The frontend can override any bot config in real-time during preview mode. Changes to prompts, KB, voice, etc. take effect immediately on the next WebSocket connection — no server restart needed.

---

## 11. Session Lifecycle

```
CONNECT
  └► WebSocket accepted
  └► Source detected (freeswitch / frontend)
  └► Config loaded (DB → frontend override)
  └► FreeSWITCH: diagnostic test tone sent
  
OPENAI CONNECT
  └► WSS connection to OpenAI Realtime API
  └► session.update sent (initial node config + tools)
  └► 3 asyncio tasks spawned:
       - receive_from_client()  → reads user audio
       - receive_from_openai()  → reads AI events
       - fs_audio_pacer()       → paces audio to FreeSWITCH (FS only)

ACTIVE SESSION
  └► User speaks → audio flows to OpenAI → AI responds
  └► Transfers: AI calls function → session.update for new node
  └► Interruptions: VAD → clear → pacer restart

DISCONNECT
  └► Client disconnects (call hung up)
  └► Backend waits max 5s for OpenAI to finish
  └► All tasks cancelled (openai_task, fs_pacer_task)
  └► WebSocket closed cleanly
```

---

## 12. Error Handling & Cleanup

### 12.1 Connection Errors

| Scenario | Behavior |
|---------|---------|
| DB load fails | Logs warning, falls back to frontend config |
| No config found (FreeSWITCH) | Closes WebSocket with code 1008 (Policy Violation) |
| OpenAI connection fails | Logs error, closes WebSocket with code 1011 |
| JSON parse error | Logs, continues (skips invalid event) |
| WebSocket disconnect | Cleans up all tasks, logs reason |

### 12.2 Task Cleanup on Hangup

```python
# On call end — guaranteed cleanup sequence:
1. Cancel openai_task (stops reading OpenAI events)
2. Cancel fs_pacer_task (stops sending audio to FreeSWITCH)
3. await fs_pacer_task (waits for clean CancelledError exit)
# Result: no "Task was destroyed but it is pending!" warnings
```

### 12.3 OpenAI Error Handling

OpenAI `response.cancel` errors (`response_cancel_not_active`) are expected and safe — they occur when the user interrupts before a response starts. These are logged but do not affect call quality.

---

## 13. Key Technical Decisions

### Why G.711 µ-law instead of PCM for OpenAI?

OpenAI natively supports G.711 µ-law at 8000Hz. FreeSWITCH also operates at 8000Hz. Using µ-law **eliminates any resampling** — audio quality is preserved with the lowest possible CPU overhead.

### Why Python-side audio pacing instead of FreeSWITCH buffering?

OpenAI delivers **entire AI responses in milliseconds** (dumps 5-10 seconds of audio nearly instantly). If forwarded directly, FreeSWITCH buffers all of it and **ignores `clear` commands** because it's already committed to playing the buffered audio.

By pacing delivery Python-side (only sending ~100ms ahead), FreeSWITCH's buffer remains small and responds instantly to `clear`.

### Why `asyncio.Task.cancel()` for interruptions?

`asyncio.Task.cancel()` causes the pacer's `await asyncio.sleep()` to raise `CancelledError` immediately — there is zero delay. Alternative approaches (flags, events) would have to wait for the current `sleep()` to expire naturally.

### Why `bytearray` rolling buffer for audio?

OpenAI sends audio deltas of arbitrary sizes. A rolling buffer allows slicing exact 320-byte boundaries regardless of how much data arrives per delta, guaranteeing consistent 20ms frames.

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **G.711 µ-law** | An audio compression standard (logarithmic) used in telephony. Also called "ulaw". 8-bit samples at 8000Hz. |
| **L16 PCM** | Linear 16-bit Pulse Code Modulation — raw uncompressed audio. 16-bit samples at 8000Hz = 16,000 bytes/second. |
| **mod_audio_stream** | A FreeSWITCH module that streams audio to/from a WebSocket using the Twilio Media Streams protocol. |
| **Twilio Media Streams** | A WebSocket-based protocol where audio is sent as JSON with base64 payload. Used by both Twilio and FreeSWITCH. |
| **VAD** | Voice Activity Detection — detects when a human starts/stops speaking. |
| **streamSid** | A UUID that identifies the active media stream session between FreeSWITCH and the backend. Required in all media/clear events. |
| **active_response_id** | A state variable tracking which OpenAI response is currently playing, used to discard stale audio after interruption. |
| **fs_audio_pacer** | An asyncio task that paces audio delivery to FreeSWITCH at real-time speed (prevents over-buffering). |
| **fs_audio_buffer** | A bytearray accumulating raw L16 audio, sliced into 320-byte frames before queuing to the pacer. |
| **Node Graph** | A visual workflow of AI agents, where each node is a specialized bot and edges define transfer conditions. |
| **RAG** | Retrieval-Augmented Generation — injecting custom knowledge base documents into the AI's context. |
| **session.update** | An OpenAI Realtime API command that reconfigures the current AI session (prompt, tools, voice, etc.). |

---

*ConnectHub AI — Powered by OpenAI Realtime API + FreeSWITCH*  
*For technical support, contact the engineering team.*
