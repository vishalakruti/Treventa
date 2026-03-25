# TREVENTA VENTURES - Backend Deployment Guide

## Quick Start (1-Command Deployment)

```bash
git clone <repo>
cd backend
pip install -r requirements.txt
bash start.sh
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure the following in `.env`:
```env
MONGO_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="treventa_db"
SECRET_KEY="<generate-with-openssl-rand-hex-32>"
PORT=8000
```

## Available Scripts

### Foreground Start (Development)
```bash
bash start.sh
```

### Background Start (Production)
```bash
bash start-background.sh
```

### Stop Server
```bash
bash stop.sh
```

### Manual Start with nohup
```bash
nohup uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2 > logs/app.log 2>&1 &
```

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /` | Basic health check (for load balancers) |
| `GET /health` | Detailed health with DB status, port, logs dir |
| `GET /api/health` | API-level health check |

## Logs

- Console logs: stdout (always)
- File logs: `logs/app.log` (auto-created)
- Background logs: `logs/nohup.log` (when using start-background.sh)

## AWS EC2 Deployment

1. Launch EC2 instance (Amazon Linux 2 / Ubuntu)
2. Install Python 3.9+:
   ```bash
   sudo yum install python3 python3-pip  # Amazon Linux
   # or
   sudo apt install python3 python3-pip  # Ubuntu
   ```
3. Clone repository
4. Configure `.env` with MongoDB Atlas connection
5. Run: `bash start-background.sh`
6. Configure security group to allow port 8000

## Features

- **Non-blocking startup**: Server runs even if MongoDB fails
- **Graceful degradation**: DB-dependent endpoints return 503, others work
- **File + Console logging**: Dual logging for debugging
- **Auto-creates directories**: logs/ created automatically
- **No hard failures**: Missing .env uses defaults with warnings

## Troubleshooting

### Check if server is running
```bash
curl http://localhost:8000/
```

### View logs
```bash
tail -f logs/app.log
```

### Check process
```bash
ps aux | grep uvicorn
```

### Stop all uvicorn processes
```bash
pkill -f 'uvicorn server:app'
```
