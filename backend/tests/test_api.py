import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_chat_endpoint(async_client):
    with patch("app.api.chat.ai_service.get_chat_response", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "Good morning, sir. All systems are operational."
        
        response = await async_client.post("/api/chat", json={"message": "Status report"})
        
        assert response.status_code == 200
        assert response.json() == {"response": "Good morning, sir. All systems are operational."}
        mock_chat.assert_called_once()

@pytest.mark.asyncio
async def test_voice_speak_endpoint(async_client):
    with patch("app.api.voice.audio_service.synthesize_speech", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"\xff\xfb\x90\x44"  # Mock MP3 frame bytes
        
        response = await async_client.post("/api/voice/speak", json={"text": "All systems nominal."})
        assert response.status_code == 200
        assert response.content == b"\xff\xfb\x90\x44"
        assert response.headers["content-type"] == "audio/mp3"
        mock_synth.assert_called_once_with("All systems nominal.", None)
