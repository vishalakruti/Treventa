# Trevanta Ventures - Web Dashboard

React + Vite + Tailwind CSS web dashboard for the Trevanta Ventures private capital platform.

## Tech Stack

- **React 18** - UI Library
- **Vite** - Build tool and dev server
- **Tailwind CSS 3** - Styling
- **Axios** - HTTP client
- **React Router** - Client-side routing

## Quick Start

### Development

```bash
cd frontend
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
# OR
npx serve -s dist
```

## Environment Configuration

Create a `.env` file in the frontend directory:

```env
# For local development
VITE_API_URL=http://localhost:8000

# For AWS EC2 deployment
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:8000
```

**IMPORTANT:** Always use environment variable for API URL. Never hardcode URLs.

## Features

### 1. Authentication
- Email/Password login
- Two-Factor Authentication (OTP)
- JWT token management
- Protected routes

### 2. Dashboard
- Portfolio summary
- Sector allocation
- Recent activity
- Active vote notices

### 3. Ventures (Projects)
- Browse investment opportunities
- Filter by status (open/closed/allocated)
- View project details
- Request participation

### 4. Investments
- Track portfolio holdings
- View equity percentages
- Monitor gains/losses
- Participation request history

### 5. Governance
- View active resolutions
- Cast votes (Yes/No/Abstain)
- Track voting deadlines

### 6. Distributions
- View profit distributions
- Track payout history

## Deployment

### Method 1: Static Hosting (Recommended)

```bash
npm run build
# Upload 'dist' folder to S3, Netlify, Vercel, etc.
```

### Method 2: Node.js Server

```bash
npm install -g serve
npm run build
serve -s dist -l 3000
```

## API Configuration

All API calls use the `VITE_API_URL` environment variable:

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

## Test Credentials

- **Email:** admin@treventa.com
- **Password:** admin123
- **OTP:** Displayed in UI (demo mode)
- **Invite Code:** DEMO2025
