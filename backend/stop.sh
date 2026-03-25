#!/bin/bash
# ==========================================
# TREVENTA VENTURES - Stop Server Script
# ==========================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ -f "logs/server.pid" ]; then
    PID=$(cat logs/server.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping server (PID: $PID)..."
        kill $PID
        rm logs/server.pid
        echo "Server stopped."
    else
        echo "Server not running (stale PID file)"
        rm logs/server.pid
    fi
else
    echo "No PID file found. Server may not be running."
    echo "To stop manually: pkill -f 'uvicorn server:app'"
fi
