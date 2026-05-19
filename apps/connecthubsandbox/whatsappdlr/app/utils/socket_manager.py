from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[agent_id] = websocket
        print(f"[SOCKET] Agent {agent_id} connected.")

    def disconnect(self, agent_id: str):
        if agent_id in self.active_connections:
            del self.active_connections[agent_id]
            print(f"[SOCKET] Agent {agent_id} disconnected.")

    async def send_to_agent(self, agent_id: str, message: str):
        websocket = self.active_connections.get(agent_id)
        if websocket:
            try:
                await websocket.send_text(message)
                print(f"[SOCKET] Sent to {agent_id}: {message}")
            except Exception as e:
                print(f"[SOCKET ERROR] Failed to send to {agent_id}: {e}")
                self.disconnect(agent_id)

manager = ConnectionManager()