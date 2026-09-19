import logging
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

JARVIS_SYSTEM_PROMPT = (
    "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the personal AI assistant "
    "to the user, whom you address as 'sir' or 'boss'. You speak with calm, intelligent "
    "British eloquence, dry wit, and concise helpfulness. "
    "Keep replies spoken-word friendly, direct, and concise (usually 1-3 sentences). "
    "Avoid formatting such as asterisks, emojis, markdown tables, or bullet points so your speech can be synthesized clearly."
)


class AIService:
    def __init__(self):
        self._api_key = settings.GOOGLE_API_KEY
        if not self._api_key:
            logger.warning("GOOGLE_API_KEY is not set. AI features will require API key configuration.")
            self.client = None
        else:
            self.client = genai.Client(api_key=self._api_key)

    def _check_api_key(self):
        if not self._api_key or not self.client:
            # Re-read settings in case .env was populated after initialization
            if settings.GOOGLE_API_KEY:
                self._api_key = settings.GOOGLE_API_KEY
                self.client = genai.Client(api_key=self._api_key)
                return
            raise ValueError("Missing GOOGLE_API_KEY. Please set it in .env or environment variables.")

    def _build_contents(self, message: str, history: Optional[List[Dict[str, Any]]] = None) -> Any:
        """Formats conversation history and current prompt for Gemini API."""
        if not history:
            return message

        contents = []
        for turn in history:
            role = turn.get("role", "user")
            # Map role to user or model
            genai_role = "model" if role in ("model", "assistant", "jarvis") else "user"
            parts = turn.get("parts")
            if parts and isinstance(parts, list):
                text_content = " ".join(parts)
            else:
                text_content = turn.get("content", "")

            if text_content:
                contents.append(types.Content(role=genai_role, parts=[types.Part.from_text(text=text_content)]))

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))
        return contents

    async def get_chat_response(self, message: str, history: Optional[List[Dict[str, Any]]] = None) -> str:
        """Non-streaming chat response using Gemini with J.A.R.V.I.S. persona."""
        self._check_api_key()
        try:
            contents = self._build_contents(message, history)
            config = types.GenerateContentConfig(
                system_instruction=JARVIS_SYSTEM_PROMPT,
                temperature=0.7,
            )
            response = self.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            text = (response.text or "").strip()
            return text or "At your service, sir."
        except Exception as e:
            logger.error(f"Error getting Gemini response: {e}")
            raise e

    async def stream_chat_response(self, message: str, history: Optional[List[Dict[str, Any]]] = None):
        """Streaming chat response using Gemini with J.A.R.V.I.S. persona."""
        self._check_api_key()
        try:
            contents = self._build_contents(message, history)
            config = types.GenerateContentConfig(
                system_instruction=JARVIS_SYSTEM_PROMPT,
                temperature=0.7,
            )
            for chunk in self.client.models.generate_content_stream(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Error streaming Gemini response: {e}")
            raise e


ai_service = AIService()
