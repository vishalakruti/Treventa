#!/bin/bash
# ==========================================
# TREVENTA VENTURES - Stop Server Script
# ==========================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PID_FILE="logs/server.pid"
LOG_FILE="logs/app.log"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[INFO] Stopping server (PID: $PID)..."
        kill "$PID" 2>/dev/null
        sleep 2
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "[WARN] Force killing..."
            kill -9 "$PID" 2>/dev/null
        fi
        rm -f "$PID_FILE"
        echo "[OK] Server stopped"
        echo "[$(date)] Server stopped (PID: $PID)" >> "$LOG_FILE"
    else
        echo "[INFO] Server not running (stale PID: $PID)"
        rm -f "$PID_FILE"
    fi
else
    echo "[INFO] No PID file found"
    # Try to find and kill any uvicorn process
    PIDS=$(pgrep -f "uvicorn server:app" 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "[INFO] Found uvicorn processes: $PIDS"
        echo "[INFO] Stopping..."
        kill $PIDS 2>/dev/null
        sleep 1
        echo "[OK] Processes stopped"
    else
        echo "[OK] No server running"
    fi
fi
