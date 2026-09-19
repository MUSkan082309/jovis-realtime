import os
import io
import tempfile
import logging
from typing import Optional
import edge_tts
from app.config import settings

logger = logging.getLogger(__name__)

# Check whisper availability
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    whisper = None
    WHISPER_AVAILABLE = False
    logger.warning("openai-whisper not installed. STT will fall back to simulated mode.")


class AudioService:
    """Service handling Speech-To-Text (Whisper) and Text-To-Speech (Edge-TTS)."""

    def __init__(self, default_model: str = "base"):
        self.default_model = default_model
        self._model = None

    @property
    def is_stt_available(self) -> bool:
        return WHISPER_AVAILABLE

    def get_model(self):
        """Lazy-loads and caches the Whisper model as a singleton in memory."""
        if not WHISPER_AVAILABLE:
            return None
        if self._model is None:
            logger.info(f"Loading Whisper model '{self.default_model}' into memory...")
            try:
                self._model = whisper.load_model(self.default_model)
                logger.info(f"Whisper model '{self.default_model}' loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                return None
        return self._model

    def transcribe_audio(self, audio_bytes: bytes) -> str:
        """
        Transcribes raw audio bytes using the cached Whisper model.
        Returns transcribed text or empty string on error/empty buffer.
        """
        if not audio_bytes or len(audio_bytes) < 500:
            logger.warning("Audio buffer is too short or empty for transcription.")
            return ""

        model = self.get_model()
        if model is None:
            logger.warning("Whisper model unavailable. Returning fallback transcript.")
            return "[Whisper unavailable — check backend dependencies]"

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                f.write(audio_bytes)
                temp_path = f.name

            # Transcribe with fp16=False for robust CPU execution
            result = model.transcribe(temp_path, fp16=False)
            transcript = (result.get("text") or "").strip()
            logger.info(f"STT complete: '{transcript}'")
            return transcript
        except Exception as e:
            logger.error(f"Error during audio transcription: {e}")
            return ""
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass

    async def synthesize_speech(self, text: str, voice: Optional[str] = None) -> bytes:
        """
        Synthesizes text into high-quality neural speech using Edge-TTS.
        Returns raw audio/mp3 bytes.
        """
        clean_text = text.strip()
        if not clean_text:
            return b""

        selected_voice = voice or settings.EDGE_TTS_VOICE
        try:
            communicate = edge_tts.Communicate(clean_text, selected_voice)
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk.get("type") == "audio" and "data" in chunk:
                    audio_buffer.write(chunk["data"])

            audio_bytes = audio_buffer.getvalue()
            logger.info(f"TTS complete ({len(audio_bytes)} bytes) for '{clean_text[:40]}...'")
            return audio_bytes
        except Exception as e:
            logger.error(f"Error during Edge-TTS synthesis: {e}")
            raise e


audio_service = AudioService()
