#!/bin/bash
# ==========================================
# TREVENTA VENTURES - Background Startup
# ==========================================
# Starts the backend in background with nohup
# Logs saved to logs/nohup.log
# ==========================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Creating logs directory..."
mkdir -p logs

echo "Starting Treventa Backend in background..."
echo "Logs will be saved to: logs/nohup.log"
echo "To stop: kill \$(cat logs/server.pid)"

# Start in background and save PID
nohup uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 > logs/nohup.log 2>&1 &
echo $! > logs/server.pid

echo "========================================="
echo "Server started with PID: $(cat logs/server.pid)"
echo "Check status: curl http://localhost:${PORT:-8000}/"
echo "View logs: tail -f logs/nohup.log"
echo "Stop server: kill \$(cat logs/server.pid)"
echo "========================================="
