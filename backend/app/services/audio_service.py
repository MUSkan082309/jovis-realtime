import io
import logging
from typing import Optional

import edge_tts
from app.config import settings

logger = logging.getLogger(__name__)


class AudioService:
    """Service handling Text-To-Speech using Edge-TTS."""

    async def synthesize_speech(
        self,
        text: str,
        voice: Optional[str] = None,
    ) -> bytes:
        """
        Synthesizes text into neural speech using Edge-TTS.
        Returns raw audio/mp3 bytes.
        """
        clean_text = text.strip()

        if not clean_text:
            return b""

        selected_voice = voice or settings.EDGE_TTS_VOICE

        try:
            communicate = edge_tts.Communicate(
                clean_text,
                selected_voice,
            )

            audio_buffer = io.BytesIO()

            async for chunk in communicate.stream():
                if chunk.get("type") == "audio" and "data" in chunk:
                    audio_buffer.write(chunk["data"])

            audio_bytes = audio_buffer.getvalue()

            logger.info(
                f"TTS complete ({len(audio_bytes)} bytes) "
                f"for '{clean_text[:40]}...'"
            )

            return audio_bytes

        except Exception as e:
            logger.error(f"Error during Edge-TTS synthesis: {e}")
            raise


audio_service = AudioService()