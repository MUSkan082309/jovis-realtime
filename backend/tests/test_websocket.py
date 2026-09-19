import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app

def test_chat_websocket_success():
    client = TestClient(app)
    
    async def mock_stream(content, history):
        yield "Greetings,"
        yield " sir."
    
    with patch("app.websocket.chat_ws.ai_service.stream_chat_response", side_effect=mock_stream):
        with client.websocket_connect("/ws/chat") as websocket:
            websocket.send_json({"type": "message", "content": "Hello"})
            
            response = websocket.receive_json()
            assert response == {"type": "token", "content": "Greetings,"}
            
            response = websocket.receive_json()
            assert response == {"type": "token", "content": " sir."}
            
            response = websocket.receive_json()
            assert response == {"type": "done"}

def test_chat_websocket_invalid_type():
    client = TestClient(app)
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({"type": "ping"})
        response = websocket.receive_json()
        assert response["type"] == "error"
        assert response["content"] == "Invalid message type"

def test_chat_websocket_error():
    client = TestClient(app)
    
    async def mock_stream_error(content, history):
        raise RuntimeError("Neural connection failed")
        if False: yield
        
    with patch("app.websocket.chat_ws.ai_service.stream_chat_response", side_effect=mock_stream_error):
        with client.websocket_connect("/ws/chat") as websocket:
            websocket.send_json({"type": "message", "content": "Hi"})
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert response["content"] == "Neural connection failed"

def test_voice_websocket_success():
    client = TestClient(app)
    
    with patch("app.websocket.voice_ws.audio_service.transcribe_audio", return_value="What is our status?") as mock_stt, \
         patch("app.websocket.voice_ws.ai_service.get_chat_response", new_callable=AsyncMock, return_value="All systems nominal, sir.") as mock_ai, \
         patch("app.websocket.voice_ws.audio_service.synthesize_speech", new_callable=AsyncMock, return_value=b"\x01\x02\x03\x04") as mock_tts:
        
        with client.websocket_connect("/ws/voice") as websocket:
            # 1. Initial status on connect
            response = websocket.receive_json()
            assert response == {"type": "status", "content": "listening"}
            
            # 2. Send simulated binary audio frames
            websocket.send_bytes(b"mock_pcm_audio_bytes" * 20)
            
            # 3. Trigger processing
            websocket.send_json({"type": "end_of_audio"})
            
            # 4. Status: thinking
            response = websocket.receive_json()
            assert response == {"type": "status", "content": "thinking"}
            
            # 5. Transcript
            response = websocket.receive_json()
            assert response == {"type": "transcript", "content": "What is our status?"}
            
            # 6. Status: speaking
            response = websocket.receive_json()
            assert response == {"type": "status", "content": "speaking"}
            
            # 7. Audio response bytes
            response_bytes = websocket.receive_bytes()
            assert response_bytes == b"\x01\x02\x03\x04"
            
            # 8. Back to listening
            response = websocket.receive_json()
            assert response == {"type": "status", "content": "listening"}

def test_voice_websocket_empty_audio():
    client = TestClient(app)
    with client.websocket_connect("/ws/voice") as websocket:
        response = websocket.receive_json()
        assert response == {"type": "status", "content": "listening"}
        
        # Trigger end_of_audio without sending bytes
        websocket.send_json({"type": "end_of_audio"})
        
        response = websocket.receive_json()
        assert response == {"type": "error", "content": "No audio received"}
        
        response = websocket.receive_json()
        assert response == {"type": "status", "content": "listening"}
