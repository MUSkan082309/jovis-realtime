# J.A.R.V.I.S. Backend

FastAPI-powered backend for the J.A.R.V.I.S. realtime AI assistant.

## Features
- FastAPI for high-performance API endpoints
- WebSocket support for realtime communication
- OpenAI GPT-4o and TTS Nova integration
- Dockerized for easy deployment

## Getting Started

### Local Setup
1. Create a virtual environment: `python -m venv venv`
2. Activate it: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn app.main:app --reload --port 3000`

### Docker
1. Build the image: `docker build -t jarvis-backend .`
2. Run the container: `docker run -p 3000:3000 jarvis-backend`

## API Endpoints
- `GET /health`: Health check endpoint
- `WS /ws/chat`: WebSocket endpoint for chat interaction
