# J.A.R.V.I.S. Test Plan & Strategy

## 1. Introduction
This document outlines the testing strategy for the J.A.R.V.I.S. assistant, covering both the FastAPI backend and the React frontend. The goal is to ensure high reliability for realtime chat and voice interactions.

## 2. Test Strategy
We will employ a multi-layered testing approach:
- **Unit Testing:** Focused on individual functions, services, and UI components in isolation.
- **Integration Testing:** Verifying the interaction between different modules (e.g., API endpoints calling services, WebSocket message handling).
- **End-to-End (E2E) Testing:** Validating critical user journeys from the frontend to the backend and back.
- **Manual/Exploratory Testing:** Focused on voice quality, latency perception, and UI/UX feel.

## 3. Tooling
- **Backend:**
    - `pytest`: Primary test runner.
    - `httpx`: For testing FastAPI REST endpoints.
    - `pytest-asyncio`: For testing asynchronous code and WebSockets.
    - `unittest.mock`: For mocking OpenAI API responses.
- **Frontend:**
    - `Vitest`: Fast unit/component test runner.
    - `React Testing Library`: For testing component behavior and accessibility.
    - `Playwright` (Future): For E2E browser-based testing.
- **General:**
    - `coverage.py`: For tracking backend test coverage.

## 4. Backend Testing Scope

### 4.1 REST API Endpoints
- **Health Check (`/health`):** Verify it returns 200 OK.
- **Chat API (`/api/chat`):**
    - Success cases: Valid prompt returns expected structure.
    - Error cases: Missing prompt, OpenAI API failure handling.
- **Voice API (`/api/voice/speak`):**
    - Verify text-to-speech conversion triggers and returns audio file/stream.

### 4.2 WebSockets
- **Chat WS (`/ws/chat`):**
    - Connection establishment and authentication (if applicable).
    - Message parsing: Ensure the server handles valid/invalid JSON.
    - Streaming: Verify tokens are streamed back correctly.
    - Completion: Verify `done` message is sent.
- **Voice WS (`/ws/voice`):**
    - Binary audio frame handling.
    - Status message updates (`listening`, `thinking`, `speaking`).
    - Transcript feedback.

### 4.3 Services
- **OpenAI Service:** Mocked tests to verify correct parameters are sent to GPT-4o, Whisper, and TTS.
- **Audio Service:** Unit tests for any audio processing, normalization, or conversion logic.

## 5. Frontend Testing Scope

### 5.1 Components
- **MessageList:** Correct rendering of user vs. AI messages.
- **MessageInput:** Input handling, disabling during "thinking" state.
- **VoiceButton:** State transitions (Idle -> Recording -> Processing).
- **ChatContainer:** Orchestration of child components.

### 5.2 Hooks
- **useWebSocket:** Connection management, reconnection logic, message dispatching.
- **useAudioRecorder:** MediaRecorder API interaction, chunking logic.
- **useAudioPlayer:** Audio playback, handling streams/blobs.

## 6. CI Approach
- **Pull Request Checks:**
    - Run backend tests (`pytest`).
    - Run frontend tests (`vitest`).
    - Linting (flake8/ruff for backend, eslint for frontend).
    - Type checking (mypy for backend, tsc for frontend).
- **Coverage Gate:** Aim for >80% coverage on new features.

## 7. Key Challenges & Solutions
- **OpenAI Costs/Latency:** Use extensive mocking for OpenAI calls to keep tests fast and free. Maintain a small set of "live" integration tests for staging.
- **Audio/Voice Testing:** Use pre-recorded audio samples (fixtures) for `useAudioRecorder` tests and verify `useAudioPlayer` receives expected Blobs.
- **WebSocket Mocking:** Use `pytest` fixtures to spin up local test servers or use specialized mock clients for WebSocket testing.
