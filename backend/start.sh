#!/bin/bash
# ==========================================
# TREVENTA VENTURES - Backend Startup Script
# ==========================================
# Usage: bash start.sh
# Runs server in BACKGROUND automatically
# Logs: logs/app.log
# ==========================================

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "========================================="
echo "TREVENTA VENTURES - Backend Deployment"
echo "========================================="
echo "Working directory: $(pwd)"

# Create logs directory (SAFETY: never crash on missing dir)
mkdir -p logs 2>/dev/null || true

# ENV Auto-Validation
if [ -f ".env" ]; then
    echo "[OK] .env file found"
    # Validate PORT if set
    if grep -q "^PORT=" .env 2>/dev/null; then
        PORT_VAL=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"')
        echo "[OK] PORT configured: $PORT_VAL"
    fi
else
    echo "[WARNING] .env file not found - using defaults"
    echo "[INFO] Copy .env.example to .env for production"
fi

# Default port
export PORT=${PORT:-8000}

# Check Python
echo "[OK] Python: $(python3 --version 2>&1)"

# Check dependencies (non-blocking)
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "[INFO] Installing dependencies..."
    pip install -r requirements.txt --quiet
fi

echo "========================================="
echo "Starting Treventa Backend (Background)..."
echo "Port: $PORT"
echo "Host: 0.0.0.0 (all interfaces)"
echo "Logs: logs/app.log"
echo "========================================="

# Kill any existing process on this port (safety)
pkill -f "uvicorn server:app.*--port $PORT" 2>/dev/null || true
sleep 1

# Start in BACKGROUND with nohup
nohup uvicorn server:app --host 0.0.0.0 --port $PORT --workers 2 >> logs/app.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > logs/server.pid

# Wait briefly and verify startup
sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "========================================="
    echo "[SUCCESS] Server started successfully!"
    echo "PID: $SERVER_PID"
    echo "Running on port: $PORT"
    echo "========================================="
    echo ""
    echo "Quick Commands:"
    echo "  Check status:  curl http://localhost:$PORT/health"
    echo "  View logs:     tail -f logs/app.log"
    echo "  Stop server:   bash stop.sh"
    echo "========================================="
    
    # Self-test
    sleep 1
    HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null || echo '{"status":"starting"}')
    echo "Health Check: $HEALTH"
else
    echo "[ERROR] Server failed to start!"
    echo "Check logs: tail -20 logs/app.log"
    exit 1
fi
