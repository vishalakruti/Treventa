# Trevanta Ventures - Frontend

React + Vite + Tailwind CSS web dashboard for private capital management.

## Quick Start

```bash
npm install
npm run dev
```

## Production Deployment

```bash
# 1. Configure API URL
nano .env
```

```env
VITE_API_URL=http://YOUR_EC2_IP:8000
```

```bash
# 2. Build
npm run build

# 3. Serve
serve -s dist -l 3000
```

## Environment Configuration

| Variable | Description | Example |
|----------|-------------|----------|
| VITE_API_URL | Backend API URL | http://1.2.3.4:8000 |

**CRITICAL:** Never hardcode URLs. Always use `import.meta.env.VITE_API_URL`

## Pages

| Route | Description |
|-------|-------------|
| /login | Authentication |
| /dashboard | Portfolio overview |
| /projects | Browse ventures |
| /projects/:id | Venture details |
| /investments | Portfolio holdings |
| /governance | Voting |
| /distributions | Payouts |

## Test Credentials

- **Email:** admin@treventa.com
- **Password:** admin123
- **OTP:** Displayed in UI (demo mode)

## Tech Stack

- React 18
- Vite 8
- Tailwind CSS 3
- Axios
- React Router

## Port: 3000
