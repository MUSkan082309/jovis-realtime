import logging
from fastapi import APIRouter, HTTPException, Response
from app.models.schemas import VoiceSpeakRequest
from app.services.audio_service import audio_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/voice/speak")
async def voice_speak_endpoint(request: VoiceSpeakRequest):
    try:
        audio_bytes = await audio_service.synthesize_speech(request.text, request.voice)
        return Response(content=audio_bytes, media_type="audio/mp3")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))