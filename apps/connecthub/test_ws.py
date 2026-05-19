import asyncio
import websockets
import json

async def test():
    try:
        async with websockets.connect("ws://localhost:8000/ws/voice/agent_123") as ws:
            print("Connected to Local Voice WS")
            config = {
                "name": "TestAgent", "voice": "alloy", "model": "gpt-4o-realtime-preview-2024-12-17",
                "firstMessage": "Hello from manual python test!", "systemPrompt": "You are a test bot",
                "kbDocs": [], "nodes": [], "edges": []
            }
            await ws.send(json.dumps(config))
            await asyncio.sleep(2)
            await ws.send(json.dumps({"event": "client_ready"}))
            for _ in range(10):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                    data = json.loads(msg)
                    if data.get("event") == "audio":
                        print("Received Audio Delta")
                    else:
                        print(f"Backend Msg: {data}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for msg")
                    continue
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
