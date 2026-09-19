import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.audio_service import AudioService

def test_audio_service_empty_buffer():
    service = AudioService()
    # Buffer under 500 bytes should be rejected early
    result = service.transcribe_audio(b"short")
    assert result == ""

def test_audio_service_model_caching():
    with patch("app.services.audio_service.WHISPER_AVAILABLE", True), \
         patch("app.services.audio_service.whisper") as mock_whisper:
        
        mock_model = MagicMock()
        mock_whisper.load_model.return_value = mock_model
        
        service = AudioService()
        m1 = service.get_model()
        m2 = service.get_model()
        
        # Model should only be loaded once (singleton caching)
        assert m1 is mock_model
        assert m2 is mock_model
        mock_whisper.load_model.assert_called_once_with("base")

def test_audio_service_transcribe():
    with patch("app.services.audio_service.WHISPER_AVAILABLE", True), \
         patch("app.services.audio_service.whisper") as mock_whisper:
        
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Hello JARVIS"}
        mock_whisper.load_model.return_value = mock_model
        
        service = AudioService()
        audio_data = b"\x00\x01" * 300  # 600 bytes
        transcript = service.transcribe_audio(audio_data)
        
        assert transcript == "Hello JARVIS"
        mock_model.transcribe.assert_called_once()

@pytest.mark.asyncio
async def test_synthesize_speech_empty():
    service = AudioService()
    result = await service.synthesize_speech("")
    assert result == b""

@pytest.mark.asyncio
async def test_synthesize_speech_success():
    with patch("app.services.audio_service.edge_tts.Communicate") as mock_communicate_cls:
        mock_comm = MagicMock()
        
        async def mock_stream():
            yield {"type": "audio", "data": b"CHUNK1_"}
            yield {"type": "audio", "data": b"CHUNK2"}
            
        mock_comm.stream = mock_stream
        mock_communicate_cls.return_value = mock_comm
        
        service = AudioService()
        audio = await service.synthesize_speech("Greetings, sir.")
        
        assert audio == b"CHUNK1_CHUNK2"
        mock_communicate_cls.assert_called_once()
