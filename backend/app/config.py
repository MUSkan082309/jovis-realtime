from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "J.A.R.V.I.S."
    
    # CORS Origins
    CORS_ORIGINS: List[str] = ["*"]
    
    # Google Gemini Settings
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    # TTS Settings - Edge-TTS (free, no API key needed)
    EDGE_TTS_VOICE: str = "en-US-JennyNeural"  # Natural feminine voice
    
    # WebSocket Settings
    WS_MAX_CONNECTIONS: int = 100
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()