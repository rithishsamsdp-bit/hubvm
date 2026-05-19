from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.voice_controller import voice_router

app = FastAPI(title="ElevenLabs Standalone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the voice router to maintain the structural similarity with `ai/app/main.py`
app.include_router(voice_router)

@app.get("/")
def read_root():
    return {"status": "ElevenLabs Standalone WSS Server Running"}

if __name__ == "__main__":
    import uvicorn
    print("\nStarting ElevenLabs Standalone Proxy...")
    print("WebSocket Endpoint: ws://localhost:8050/ws/voice/{node_id}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8050, reload=True)
