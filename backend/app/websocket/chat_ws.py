import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/chat")
async def chat_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Chat WebSocket connection established")
    history = []
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                content = message_data.get("content")
                try:
                    full_response = ""
                    async for token in ai_service.stream_chat_response(content, history):
                        full_response += token
                        await websocket.send_json({
                            "type": "token",
                            "content": token
                        })
                    
                    # Update history for Gemini format
                    history.append({"role": "user", "parts": [content]})
                    history.append({"role": "model", "parts": [full_response]})
                    
                    await websocket.send_json({"type": "done"})
                except Exception as e:
                    logger.error(f"Error in chat streaming: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "content": str(e)
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "content": "Invalid message type"
                })
                
    except WebSocketDisconnect:
        logger.info("Chat WebSocket connection closed")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass