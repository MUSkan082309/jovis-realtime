🤖 J.A.R.V.I.S. — Realtime AI Voice Assistant & Cockpit


An ultra-low-latency, full-stack realtime voice assistant and cybernetic cockpit inspired by Tony Stark's iconic J.A.R.V.I.S. Engineered with Google Gemini 2.0 Flash for fast reasoning, Microsoft Edge-TTS for human-like neural speech synthesis, singleton cached OpenAI Whisper for speech-to-text, and a custom HTML5 Canvas Arc Reactor that pulsates reactively to live microphone frequencies.

🏗️ System Architecture

                                  J.A.R.V.I.S. ECOSYSTEM
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                               FRONTEND (React + Vite)                           │
 │  ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────┐  │
 │  │   Arc Reactor Canvas  │   │   Telemetry Cockpit   │   │  Particle Physics │  │
 │  │  (Audio-Reactive HUD) │   │  (GPU, CPU, FPS, MEM) │   │   Background FX   │  │
 │  └───────────┬───────────┘   └───────────┬───────────┘   └─────────┬─────────┘  │
 └──────────────┼───────────────────────────┼─────────────────────────┼────────────┘
                │                           │                         │
                │        HTTP REST (Port 8000) / Full-Duplex WebSockets       │
                ▼                           ▼                         ▼
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                               BACKEND (FastAPI Core)                            │
 │                                                                                 │
 │   ┌───────────────────────┐ ┌───────────────────────┐ ┌──────────────────────┐  │
 │   │      /ws/voice        │ │       /ws/chat        │ │     AudioService     │  │
 │   │  (Binary Audio Stream)│ │   (Token Streaming)   │ │  (Whisper Singleton) │  │
 │   └──────────┬────────────┘ └───────────┬───────────┘ └──────────┬───────────┘  │
 └──────────────┼──────────────────────────┼────────────────────────┼──────────────┘
                │                          │                        │
       ┌────────┴─────────┐       ┌────────┴─────────┐     ┌────────┴─────────┐
       ▼                  ▼       ▼                  ▼     ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ Whisper STT  │   │ Gemini 2.0   │   │  Edge-TTS Neural  │   │ Standalone Fallback│
│ (Local/Zero$)│   │ Flash Engine │   │ (Free Neural MP3) │   │ (Web Speech + Wiki│
└──────────────┘   └──────────────┘   └───────────────────┘   └───────────────────┘

✨ Key Capabilities

⚡ Zero-Reload Whisper Pipeline: Uses an in-memory cached Whisper singleton in AudioService, eliminating multi-second per-utterance model load times for sub-second STT turnaround.

🧠 Google Gemini 2.0 Flash Intelligence: Tuned with custom British eloquence system prompts ("At your service, sir") and conversational context memory.

🔊 Zero-Cost Neural Speech Synthesis: High-fidelity audio generation using Microsoft Edge TTS with no external subscription fees.

🛡️ Interactive Arc Reactor Cockpit: Canvas-rendered concentric rings rotating with audio frequency reactivity, mode transitions (idle $\to$ listening $\to$ thinking $\to$ speaking).

🖥️ Realtime Hardware Telemetry: Probes and visualizes client WebGL GPU renderer, logical CPU cores, system memory, screen pixel ratio, and live FPS frame pacing.

🌐 Dual Operation Resilience:

Full-Stack Mode: WebSockets with binary audio frames, token streaming, and server-side Whisper + Gemini.

Client Standalone Mode: Seamless fallback using Web Speech API synthesis + client-side Wikipedia knowledge grounding if the backend server is offline.

🐳 Containerized & One-Click Launch: Pre-configured Docker Compose with Nginx reverse proxy and a Windows run.bat auto-launcher.

⚡ Latency & Cost Optimization Matrix

Pipeline Stage

Legacy Approach

J.A.R.V.I.S. Architecture

Latency Delta

Marginal Cost

Speech-To-Text (STT)

Whisper model reloaded on loop

Cached in-memory Singleton

-2.8s per turn

$0.00 (Local)

LLM Reasoning

GPT-4o standard API

Gemini 2.0 Flash WebSocket

-600ms TTFT

Free Tier / Negligible

Speech Synthesis (TTS)

OpenAI TTS Nova ($0.015/1k chars)

Edge-TTS Neural Streaming

-400ms chunking

$0.00 (Free)

UI Telemetry Overhead

Heavy component re-renders

Direct Canvas requestAnimationFrame

60 FPS locked

Minimal CPU

🚀 Quick Start

1. Prerequisites

Docker & Docker Compose OR Python 3.10+ & Node.js 18+

Google Gemini API Key (Free)

Option A: One-Command Docker Launch (Recommended)

# 1. Clone the repository
git clone https://github.com/MUSkan082309/jarvis-realtime.git
cd jarvis-realtime

# 2. Set your Gemini API Key and build
export GOOGLE_API_KEY="your_api_key_here"  # Windows pwsh: $env:GOOGLE_API_KEY="your_api_key_here"
docker compose up --build

Access the interfaces:

Cockpit HUD: http://localhost:5173

FastAPI API & Docs: http://127.0.0.1:8000/docs
Health Check: http://127.0.0.1:8000/health

Option B: Windows 1-Click Launcher

Double click run.bat or run:

run.bat

The script will automatically detect your environment, configure Python venv, install npm modules, start backend and frontend, and open your browser automatically.

Option C: Manual Development Setup

Backend:

cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
echo "GOOGLE_API_KEY=your_key_here" > .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

Frontend:

cd frontend
npm install
npm run dev

📡 API & WebSocket Specification

REST Endpoints

GET /health: Health status probe ({"status": "healthy", "service": "jarvis-backend"}).

POST /api/chat: Send text prompt with conversation history.

{
  "message": "Give me a status update on power reserves",
  "history": []
}

POST /api/voice/speak: Synthesize raw text to neural MP3 bytes.

{
  "text": "All systems nominal, sir.",
  "voice": "en-US-JennyNeural"
}

WebSocket Protocols

/ws/chat: Bidirectional text streaming.

Client sends: {"type": "message", "content": "Hello Jarvis"}

Server yields: {"type": "token", "content": "Hello"} $\to$ {"type": "done"}

/ws/voice: Full-duplex voice channel.

Client streams raw audio chunks as binary bytes.

Client indicates speech completion: {"type": "end_of_audio"}

Server yields status sequence: thinking $\to$ {"type": "transcript", ...} $\to$ speaking $\to$ binary MP3 audio response $\to$ listening.

🧪 Automated Testing

Run the full backend test suite:

cd backend
python -m pytest tests -v

Run frontend production build & TypeScript validation:

cd frontend
npm run build

📜 Project Structure

jarvis-realtime/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (chat, voice)
│   │   ├── services/        # ai_service.py (Gemini), audio_service.py (Whisper/Edge-TTS)
│   │   ├── websocket/       # voice_ws.py (Full-duplex audio), chat_ws.py
│   │   ├── config.py        # Pydantic environment settings
│   │   └── main.py          # FastAPI application entrypoint
│   ├── tests/               # Pytest integration & unit test suite
│   ├── Dockerfile           # Backend container definition
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # ArcReactor, BootSequence, Telemetry, Chat
│   │   ├── hooks/           # useWebSocket, useSpeech, useMicAnalyser, usePerformance
│   │   ├── lib/             # System probe, Wikipedia grounding, AI client
│   │   └── styles/          # Neon HUD dark glassmorphism design system
│   ├── Dockerfile           # Frontend multi-stage Nginx container
│   ├── nginx.conf           # Reverse proxy routing for /api and /ws
│   └── package.json
├── docker-compose.yml       # Production orchestration
├── run.bat                  # Windows 1-click launcher
└── README.md

📄 License

Distributed under the MIT License. See LICENSE for more information.