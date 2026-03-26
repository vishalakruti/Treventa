# Trevanta Ventures - AWS EC2 Deployment Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS EC2 Instance                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)          Backend (FastAPI)                │
│  Port: 3000                Port: 8000                       │
│  serve -s dist             uvicorn server:app               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    MongoDB Atlas / Local
```

## Quick Deployment (30 minutes)

### Prerequisites

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+
sudo apt-get install -y python3 python3-pip python3-venv

# Install serve (for frontend)
sudo npm install -g serve
```

### Step 1: Clone Repository

```bash
git clone <your-repo>
cd trevanta-ventures
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env
```

**Edit `.env`:**
```env
MONGO_URL="mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="trevanta_db"
SECRET_KEY="<generate-with: openssl rand -hex 32>"
PORT=8000
```

### Step 3: Start Backend

```bash
bash start.sh
```

**Verify:**
```bash
curl http://localhost:8000/
# Should return: {"status":"running","port":8000,"database_connected":true}
```

### Step 4: Frontend Setup

```bash
cd ../frontend

# Configure environment
nano .env
```

**Edit `.env`:**
```env
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:8000
```

### Step 5: Build & Serve Frontend

```bash
npm install
npm run build
serve -s dist -l 3000 &
```

### Step 6: Configure Security Group

In AWS Console → EC2 → Security Groups:

| Type | Port | Source |
|------|------|--------|
| HTTP | 80   | 0.0.0.0/0 |
| Custom TCP | 3000 | 0.0.0.0/0 |
| Custom TCP | 8000 | 0.0.0.0/0 |

### Step 7: Access Application

Open: `http://YOUR_EC2_PUBLIC_IP:3000`

**Test Credentials:**
- Email: admin@treventa.com
- Password: admin123
- OTP: Displayed in UI

---

## Backend Reference

### Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Basic health |
| `GET /health` | Detailed status |
| `GET /api/health` | API health |

### Start Commands

```bash
# Foreground
bash start.sh

# Background
bash start-background.sh

# Stop
bash stop.sh

# Manual
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2
```

### Logs

```bash
# Application logs
tail -f logs/app.log

# Background logs
tail -f logs/nohup.log
```

---

## Frontend Reference

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Serve production
serve -s dist -l 3000
```

### Environment Variables

```env
# Required
VITE_API_URL=http://YOUR_SERVER:8000
```

---

## Troubleshooting

### Backend won't start

```bash
# Check if port is in use
lsof -i :8000

# Kill existing process
bash stop.sh

# Check logs
tail -20 logs/app.log
```

### Frontend API errors

```bash
# Verify VITE_API_URL
cat frontend/.env

# Rebuild with correct URL
cd frontend
npm run build
```

### MongoDB connection failed

```bash
# Check MongoDB URL
cat backend/.env | grep MONGO

# Test connection
curl http://localhost:8000/health
```

---

## Port Summary

| Service | Port | Notes |
|---------|------|-------|
| Frontend | 3000 | React app |
| Backend | 8000 | FastAPI |
| MongoDB | 27017 | Local only |

---

## Production Checklist

- [ ] MongoDB Atlas configured
- [ ] SECRET_KEY generated (not default)
- [ ] VITE_API_URL set to public IP
- [ ] Security group ports open
- [ ] SSL/HTTPS configured (optional)
- [ ] Demo data seeded: `curl -X POST http://localhost:8000/api/seed/demo-data`
