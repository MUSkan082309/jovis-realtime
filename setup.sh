#!/bin/bash
cd /home/team/shared/repo/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn websockets python-dotenv pydantic pydantic-settings httpx google-generativeai edge-tts -q 2>&1 | tail -3
echo "=== DONE ==="