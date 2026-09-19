import pytest
from unittest.mock import MagicMock, patch
from app.services.ai_service import AIService

def test_ai_service_initialization_without_key():
    with patch("app.services.ai_service.settings") as mock_settings:
        mock_settings.GOOGLE_API_KEY = ""
        service = AIService()
        assert service.client is None

@pytest.mark.asyncio
async def test_get_chat_response_missing_key_raises():
    with patch("app.services.ai_service.settings") as mock_settings:
        mock_settings.GOOGLE_API_KEY = ""
        service = AIService()
        with pytest.raises(ValueError, match="Missing GOOGLE_API_KEY"):
            await service.get_chat_response("Hello")

@pytest.mark.asyncio
async def test_get_chat_response_success():
    with patch("app.services.ai_service.settings") as mock_settings:
        mock_settings.GOOGLE_API_KEY = "dummy_key"
        mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
        
        with patch("app.services.ai_service.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.text = "At your command, sir."
            mock_client.models.generate_content.return_value = mock_response
            
            service = AIService()
            reply = await service.get_chat_response("Status check")
            
            assert reply == "At your command, sir."
            mock_client.models.generate_content.assert_called_once()

@pytest.mark.asyncio
async def test_stream_chat_response_success():
    with patch("app.services.ai_service.settings") as mock_settings:
        mock_settings.GOOGLE_API_KEY = "dummy_key"
        mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
        
        with patch("app.services.ai_service.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client
            
            chunk1 = MagicMock()
            chunk1.text = "Online "
            chunk2 = MagicMock()
            chunk2.text = "and ready."
            mock_client.models.generate_content_stream.return_value = [chunk1, chunk2]
            
            service = AIService()
            chunks = []
            async for token in service.stream_chat_response("Initialize"):
                chunks.append(token)
                
            assert "".join(chunks) == "Online and ready."
