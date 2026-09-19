import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import chat, voice
from app.websocket import chat_ws, voice_ws

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API Routes
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(voice.router, prefix="/api", tags=["voice"])

# WebSocket Routes
app.include_router(chat_ws.router, prefix="/ws", tags=["websocket"])
app.include_router(voice_ws.router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "jarvis-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)