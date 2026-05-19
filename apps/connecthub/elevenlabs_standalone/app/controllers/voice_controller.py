import json
import base64
import asyncio
import websockets
import audioop
import time  
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

voice_router = APIRouter()

import os
ELEVENLABS_AGENT_ID = "agent_3101kmmypx5mfy0a8n78h4fz9tdf"
ELEVENLABS_WSS_URL = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={ELEVENLABS_AGENT_ID}"

# --- Added API For Transfer Call ---
class CallTransferRequest(BaseModel):
    call_id: str
    destination_number: str
    context: str = "default"

class ClickToCallRequest(BaseModel):
    agentid: str
    agent_phone_number: str
    user_phone_number: str
    custom_parameters: dict | None = None

@voice_router.post("/ws/elevenlabs/transfer")
async def transfer_call(req: CallTransferRequest):
    """
    Called by ElevenLabs Server Tool Webhook to transfer the call.
    """
    print(f"[Transfer API] Request to transfer Call {req.call_id} to {req.destination_number}")
    
    try:
        import sys
        import os
        # Add livemonitoring app path to sys.path to find ESL.py and _ESL.so
        esl_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../livemonitoring/app"))
        if esl_path not in sys.path:
            sys.path.append(esl_path)
            
        from ESL import ESLconnection
    except ImportError as e:
        return {"status": "error", "message": f"ESL module not found. Path searched: {esl_path}. Error: {e}"}

    # Note: Update FreeSWITCH IP, PORT, password accordingly
    fs_ip = "13.232.183.255"
    fs_port = "8021"
    fs_pass = "Pulse#$2024" 
    
    con = None
    try:
        con = ESLconnection(fs_ip, fs_port, fs_pass)
        if not con.connected():
            return {"status": "error", "message": "Could not connect to FreeSWITCH ESL"}
            
        # Clean the destination number (Strip '+' so +91 becomes 91)
        dest_num = req.destination_number.replace("+", "").strip()
        
        # 1. Stop the ElevenLabs audio stream to prevent the bot from listening to the transferred call
        con.api("uuid_audio_stream_elevanlabs", f"{req.call_id} stop")
        
        # 2. Execute the transfer command
        if req.context == "inline":
            # For direct application execution without XML dialplan (bypasses IVRs)
            # Syntax: uuid_transfer <uuid> <applications> inline
            cmd_args = f"{req.call_id} '{dest_num}' inline"
        else:
            # Syntax: uuid_transfer <uuid> <destination_number> XML <context>
            cmd_args = f"{req.call_id} {dest_num} XML {req.context}"
        
        e = con.api("uuid_transfer", cmd_args)
        
        if e:
            fs_response = e.getBody()
            print(f"[Transfer API] FreeSWITCH Response: {fs_response}")
            return {"status": "success", "message": "Transfer initiated", "fs_response": fs_response}
        else:
            return {"status": "error", "message": "Failed to get response from ESL api command"}
            
    except Exception as e:
        print(f"[Transfer API] FreeSWITCH ESL Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        # Puthusa add panniruka part - properly disconnecting after api call finishes 
        if con and con.connected():
            con.disconnect()

@voice_router.post("/ws/elevenlabs/click-to-call")
async def click_to_call(req: ClickToCallRequest):
    """
    Triggers a Click-to-Call by originating a call on FreeSWITCH.
    """
    import uuid
    call_uuid = str(uuid.uuid4())
    print(f"[Click-to-Call API] Request for Agent {req.agentid} to {req.user_phone_number} (UUID: {call_uuid})")

    try:
        import sys
        import os
        # Add livemonitoring app path to sys.path to find ESL.py and _ESL.so
        esl_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../livemonitoring/app"))
        if esl_path not in sys.path:
            sys.path.append(esl_path)
            
        from ESL import ESLconnection
    except ImportError as e:
        return {"status": "error", "message": f"ESL module not found. Path searched: {esl_path}. Error: {e}"}

    # FreeSWITCH Connection Details (Match transfer_call)
    fs_ip = "13.232.183.255"
    fs_port = "8021"
    fs_pass = "Pulse#$2024" 
    
    con = None
    try:
        con = ESLconnection(fs_ip, fs_port, fs_pass)
        if not con.connected():
            return {"status": "error", "message": "Could not connect to FreeSWITCH ESL"}
            
        # Clean inputs
        agent_phone = req.agent_phone_number.replace("+", "").strip()
        user_phone = req.user_phone_number.replace("+", "").strip()
        agent_id = req.agentid.strip()
        
        # Extract metadata from custom_parameters if available
        custom_params = req.custom_parameters or {}
        first_msg = custom_params.get("elevenlabs_first_message", "Hi, welcome to Chennai!")
        lang = custom_params.get("elevenlabs_language", "en")
        
        # Serialize custom parameters for FreeSWITCH variable
        custom_params_json = json.dumps(custom_params, separators=(',', ':'))
        
        # Escape characters that break FreeSWITCH originate variable blocks
        fs_custom_params = custom_params_json.replace(',', '\,').replace('{', '\{').replace('}', '\}')

        # Construct the originate command string based on user template
        # Note: Using braces {{ }} to escape them for the f-string but FreeSWITCH uses single { }
        originate_cmd = (
            f"originate {{"
            f"elevenlabs_first_message='{first_msg}',"
            f"elevenlabs_language='{lang}',"
            f"data1='campaign_999',"
            f"data2='high_priority',"
            f"custom_parameters='{fs_custom_params}',"
            f"ws_url=wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id},"
            f"unique_call_identifier='{call_uuid}',"
            f"api_hangup_hook='lua /opt/freeswitch/storage/script/sarvam_connecthub_hangup.lua',"
            f"origination_caller_id_number=91{agent_phone},"
            f"sip_h_X-fscallerid={agent_phone},"
            f"sip_sticky_contact=true,"
            f"progress_timeout=20,"
            f"cli_raw={agent_phone},"
            f"hangup_after_bridge=true,"
            f"ignore_early_media=ring_ready,"
            f"c_accountNo=2191750116259,"
            f"c_accountId=219,"
            f"c_clinumberId=12666,"
            f"c_clinumberName={agent_phone},"
            f"sip_h_X-client_ip=10.0.4.208,"
            f"sip_h_X-client_port=5060,"
            f"sip_h_X-dialNumber={user_phone},"
            f"customer_number=91{user_phone},"
            f"m_memberExtensionNo=2191000,"
            f"customer_number_raw={user_phone}"
            f"}}sofia/gateway/Airtel-MT-CHN-SARVAM/718253765391{user_phone} 91{agent_phone} XML sarvambot 91{user_phone}"
        )

        print(f"[Click-to-Call API] Executing: bgapi {originate_cmd}")
        
        # Use bgapi to execute in background
        e = con.api("bgapi", originate_cmd)
        
        if e:
            fs_response = e.getBody()
            print(f"[Click-to-Call API] FreeSWITCH Response: {fs_response}")
            return {
                "status": "success", 
                "message": "Click-to-call initiated", 
                "call_uuid": call_uuid,
                "fs_response": fs_response,
                "custom_params":custom_params,
                "custom_params_json":custom_params_json
            }
        else:
            return {"status": "error", "message": "Failed to get response from ESL bgapi command"}
            
    except Exception as e:
        print(f"[Click-to-Call API] FreeSWITCH ESL Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if con and con.connected():
            con.disconnect()

@voice_router.websocket("/ws/elevenlabs")
async def elevenlabs_voice_proxy(websocket: WebSocket):
    """
    Acts as a bridge between FreeSWITCH and ElevenLabs Conversational AI.
    Converts strictly between:
    - FreeSWITCH: 8000Hz PCM (Linear 16-bit L16)
    - ElevenLabs: 16000Hz PCM (Linear 16-bit L16)
    """
    await websocket.accept()
    print("[ElevenLabs Proxy] Local client connected")

    # For Audioop rate conversion state
    from typing import Any
    state: dict[str, Any] = {
        "stream_sid": "default",
        "el_to_fs_state": None,
        "fs_to_el_state": None
    }

    fs_playback_queue = asyncio.Queue()
    fs_audio_buffer   = bytearray()

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
            # 320 bytes of L16 (8kHz) = 20ms = 0.02s
            next_play_time += chunk["size"] / 16000.0
            
    fs_pacer_task = asyncio.create_task(fs_audio_pacer())

    try:
        elevenlabs_ws = await websockets.connect(ELEVENLABS_WSS_URL)
        print("[ElevenLabs Proxy] Connected to ElevenLabs AI")
    except Exception as e:
        print(f"[ElevenLabs Proxy] Failed to connect to ElevenLabs: {e}")
        await websocket.close()
        return

    # Receive from ElevenLabs (16kHz PCM) -> FreeSWITCH (8kHz PCM)
    async def receive_from_elevenlabs():
        nonlocal fs_audio_buffer
        try:
            async for raw_message in elevenlabs_ws:
                data = json.loads(raw_message)
                msg_type = data.get("type")
                
                if msg_type == "audio":
                    b64_audio = data.get("audio_event", {}).get("audio_base_64", "")
                    if b64_audio:
                        raw_lin_16k = base64.b64decode(b64_audio)
                        
                        # Downsample 16kHz L16 -> 8kHz L16
                        lin_8k, state["el_to_fs_state"] = audioop.ratecv(
                            raw_lin_16k, 2, 1, 16000, 8000, state["el_to_fs_state"]
                        )
                        
                        fs_audio_buffer.extend(lin_8k)
                        
                        # Pack exactly 320 bytes (20ms) of L16
                        while len(fs_audio_buffer) >= 320:
                            chunk_bytes = bytes(fs_audio_buffer[:320])
                            fs_audio_buffer = fs_audio_buffer[320:]
                            await fs_playback_queue.put({
                                "msg": {
                                    "event": "media",
                                    "streamSid": state["stream_sid"],
                                    "media": {"payload": base64.b64encode(chunk_bytes).decode("utf-8")},
                                },
                                "size": 320,
                            })

                elif msg_type == "agent_response":
                    text = data.get("agent_response_event", {}).get("agent_response", "")
                    print(f"[ElevenLabs AI -> Local]: {text}")
                    
                elif msg_type == "interruption":
                    # Clear FreeSWITCH Buffer immediately
                    fs_audio_buffer.clear()
                    while not fs_playback_queue.empty():
                        try:
                            fs_playback_queue.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                    
                    fs_clear_msg = {
                        "event": "clear",
                        "streamSid": state["stream_sid"]
                    }
                    await websocket.send_text(json.dumps(fs_clear_msg))

        except websockets.exceptions.ConnectionClosed:
            print("[ElevenLabs Proxy] ElevenLabs disconnected.")
        except Exception as e:
            print(f"[ElevenLabs Proxy] Error reading from ElevenLabs: {e}")

    # Receive from FreeSWITCH (8kHz PCM) -> ElevenLabs (16kHz PCM)
    async def receive_from_local():
        try:
            while True:
                user_msg = await websocket.receive_text()
                data = json.loads(user_msg)
                
                event_type = data.get("event")
                
                if event_type == "start":
                    start_data = data.get("start", {})
                    # Handle both camelCase and snake_case for stream_sid just in case
                    state["stream_sid"] = start_data.get("streamSid", start_data.get("stream_sid", "default"))
                    print(f"[ElevenLabs Proxy] Stream started: {state['stream_sid']}")
                    
                    # Send Stream SID as a Dynamic Variable to ElevenLabs 
                    # so that the webhook (Server Tool) can access it as {{stream_sid}}
                    init_msg = {
                        "type": "conversation_initiation_client_data",
                        "dynamic_variables": {
                            "stream_sid": state["stream_sid"]
                        }
                    }
                    await elevenlabs_ws.send(json.dumps(init_msg))
                
                elif event_type == "media":
                    b64_audio = data.get("media", {}).get("payload", "")
                    if b64_audio:
                        raw_lin_8k = base64.b64decode(b64_audio)
                        
                        # Upsample 8kHz L16 -> 16kHz L16
                        lin_16k, state["fs_to_el_state"] = audioop.ratecv(
                            raw_lin_8k, 2, 1, 8000, 16000, state["fs_to_el_state"]
                        )
                        
                        el_msg = {
                            "type": "user_audio_chunk",
                            "user_audio_chunk": base64.b64encode(lin_16k).decode("utf-8")
                        }
                        await elevenlabs_ws.send(json.dumps(el_msg))
                
                elif event_type == "stop":
                    print("[ElevenLabs Proxy] FreeSWITCH sent stop event")
                    break

        except WebSocketDisconnect:
            print("[ElevenLabs Proxy] Local client disconnected.")
        except Exception as e:
            print(f"[ElevenLabs Proxy] Error reading from local client: {e}")

    # Run both concurrently
    task1 = asyncio.create_task(receive_from_elevenlabs())
    task2 = asyncio.create_task(receive_from_local())
    
    try:
        # Use wait so we finish as soon as either side disconnects
        done, pending = await asyncio.wait(
            [task1, task2],
            return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        # 1. Stop the pacer
        if fs_pacer_task and not fs_pacer_task.done():
            fs_pacer_task.cancel()

        # 2. Cancel any pending tasks (the other side of the proxy)
        for task in [task1, task2]:
            if not task.done():
                task.cancel()
        
        # 3. Safely close ElevenLabs
        try:
            if elevenlabs_ws and not elevenlabs_ws.closed:
                await elevenlabs_ws.close()
        except Exception:
            pass

        # 4. Safely close local WebSocket
        try:
            await websocket.close()
        except Exception:
            # Already closed or disconnect in progress
            pass
