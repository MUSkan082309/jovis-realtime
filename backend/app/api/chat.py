from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        history = [{"role": "user" if m.role == "user" else "model", "parts": [m.content]} for m in request.history] if request.history else []
        response = await ai_service.get_chat_response(request.message, history)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))