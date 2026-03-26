#!/bin/bash
# ==========================================
# TREVANTA VENTURES - Backend Startup Script
# ==========================================
# Usage: bash start.sh
# Runs server in BACKGROUND automatically
# ==========================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Default port
PORT=${PORT:-8000}
PID_FILE="logs/server.pid"
LOG_FILE="logs/app.log"

echo "========================================="
echo "TREVANTA VENTURES - Backend Deployment"
echo "========================================="

# 1. Create logs directory (safe)
mkdir -p logs 2>/dev/null || true

# 2. ENV validation
if [ -f ".env" ]; then
    echo "[OK] .env file found"
    # Load PORT from .env if set
    if grep -q "^PORT=" .env 2>/dev/null; then
        PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
        echo "[OK] PORT from .env: $PORT"
    fi
else
    echo "[WARN] .env missing - using defaults"
fi

# 3. Check for existing process (prevent duplicates)
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[WARN] Server already running (PID: $OLD_PID)"
        echo "[INFO] Stopping existing server..."
        kill "$OLD_PID" 2>/dev/null
        sleep 2
        # Force kill if still running
        if kill -0 "$OLD_PID" 2>/dev/null; then
            kill -9 "$OLD_PID" 2>/dev/null
            sleep 1
        fi
        echo "[OK] Existing server stopped"
    fi
    rm -f "$PID_FILE"
fi

# 4. Check port availability
if command -v lsof &>/dev/null; then
    PORT_PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "[WARN] Port $PORT in use by PID: $PORT_PID"
        echo "[INFO] Attempting to free port..."
        kill "$PORT_PID" 2>/dev/null
        sleep 2
        # Verify port is free
        if lsof -ti :$PORT &>/dev/null; then
            echo "[ERROR] Cannot free port $PORT - exiting"
            echo "[$(date)] STARTUP FAILED: Port $PORT in use" >> "$LOG_FILE"
            exit 1
        fi
        echo "[OK] Port $PORT freed"
    fi
fi

# 5. Check dependencies
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "[INFO] Installing dependencies..."
    pip install -r requirements.txt --quiet
fi

echo "========================================="
echo "Starting server on port $PORT..."
echo "========================================="

# 6. Start server in background
echo "[$(date)] Starting Trevanta Backend on port $PORT" >> "$LOG_FILE"
nohup python3 -m uvicorn server:app --host 0.0.0.0 --port "$PORT" --workers 2 >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# 7. Store PID immediately
echo "$SERVER_PID" > "$PID_FILE"

# 8. Wait and verify startup (with retry)
echo "[INFO] Waiting for server startup..."
sleep 3

RETRY=0
MAX_RETRY=3
SUCCESS=false

while [ $RETRY -lt $MAX_RETRY ]; do
    if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    RETRY=$((RETRY + 1))
    echo "[INFO] Health check attempt $RETRY/$MAX_RETRY..."
    sleep 2
done

# 9. Confirm result
if [ "$SUCCESS" = true ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    HEALTH=$(curl -s "http://localhost:$PORT/health" 2>/dev/null)
    echo "========================================="
    echo "[SUCCESS] Server started successfully"
    echo "PID: $SERVER_PID"
    echo "Port: $PORT"
    echo "Health: $HEALTH"
    echo "========================================="
    echo ""
    echo "Commands:"
    echo "  Status:  curl http://localhost:$PORT/health"
    echo "  Logs:    tail -f $LOG_FILE"
    echo "  Stop:    bash stop.sh"
    echo "========================================="
    echo "[$(date)] STARTUP SUCCESS - PID: $SERVER_PID, Port: $PORT" >> "$LOG_FILE"
else
    echo "========================================="
    echo "[ERROR] Server failed to start"
    echo "========================================="
    echo "Check logs: tail -20 $LOG_FILE"
    echo "[$(date)] STARTUP FAILED - Check logs for details" >> "$LOG_FILE"
    # Cleanup failed process
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
    exit 1
fi
