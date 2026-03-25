#!/bin/bash
# ==========================================
# TREVENTA VENTURES - Backend Startup Script
# ==========================================
# Usage: bash start.sh
# For background: nohup bash start.sh > logs/startup.log 2>&1 &
# ==========================================

set -e

echo "========================================="
echo "TREVENTA VENTURES - Backend Deployment"
echo "========================================="

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Working directory: $(pwd)"

# Create logs directory
echo "Creating logs directory..."
mkdir -p logs

# Check for .env file
if [ -f ".env" ]; then
    echo ".env file found"
else
    echo "WARNING: .env file not found - using defaults or environment variables"
    echo "Copy .env.example to .env and configure for production"
fi

# Check Python version
echo "Python version: $(python3 --version 2>&1 || python --version 2>&1)"

# Check if requirements are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo "========================================="
echo "Starting Treventa Backend..."
echo "Port: ${PORT:-8000}"
echo "Workers: 2"
echo "Host: 0.0.0.0 (all interfaces)"
echo "========================================="

# Start uvicorn with production settings
# Logs will go to logs/app.log automatically via Python logging
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
