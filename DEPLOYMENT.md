# Vercel Deployment Fix

## Changes Made

### 1. **Fixed Client-Side Routing** (`frontend/src/main.jsx`)
- Changed landing page detection from checking `/api/home` and `/home` to just `/`
- Now: `/` = Landing Page, everything else = Editor SPA

### 2. **Fixed LandingPage Button** (`frontend/src/components/LandingPage.jsx`)
- Changed button redirect from `/api/edit` to `/editor`
- This uses the SPA's internal routing instead of trying to redirect to a server route

### 3. **Simplified `vercel.json`**
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
- Only builds and deploys the frontend (React SPA)
- All routes fall back to `/index.html` for client-side routing

### 4. **Fixed Backend URL** (`frontend/src/components/feedback/FeedbackModal.jsx`)
- Updated to use environment variable: `import.meta.env.VITE_BACKEND_URL`
- Falls back to `http://localhost:5000` in development
- In production on Vercel, set `VITE_BACKEND_URL` to your actual backend URL

## How It Works Now

### Local Development
```
http://localhost:5173/           → LandingPage
http://localhost:5173/editor     → Editor SPA
http://localhost:5173/anything   → Editor SPA (client routing)
Feedback API: http://localhost:5000/api/feedback
```

### Production (Vercel)
```
https://hyperion-beige-xi.vercel.app/           → LandingPage
https://hyperion-beige-xi.vercel.app/editor     → Editor SPA
https://hyperion-beige-xi.vercel.app/anything   → Editor SPA (client routing)
Feedback API: https://your-backend-url/api/feedback (via env var)
```

## Deployment Steps

1. **Frontend (Vercel):**
   - Push to GitHub
   - Connect repo to Vercel
   - Set environment variable in Vercel dashboard: `VITE_BACKEND_URL=<your-backend-url>`

2. **Backend (Optional):**
   - Deploy `hyperion-backend/server.js` separately (Heroku, Railway, DigitalOcean, etc.)
   - Or keep it running locally and use ngrok to tunnel

## Environment Variables

Create `frontend/.env.production` for Vercel:
```
VITE_BACKEND_URL=https://your-backend-url.com
```

This will be loaded during the Vercel build process.
