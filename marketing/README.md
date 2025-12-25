# Inzwa Marketing Site

Landing page and entry point for the Inzwa hackathon demo.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   
   **Local Development:** 
   - Marketing site runs on `http://localhost:3000` (default)
   - Demo Store should run on `http://localhost:3001` (or set `NEXT_PUBLIC_DEMO_STORE_URL`)
   - Dashboard should run on `http://localhost:3002` (or set `NEXT_PUBLIC_DASHBOARD_URL`)
   
   To run on different ports:
   ```bash
   # Terminal 1: Marketing (port 3000)
   cd marketing && npm run dev
   
   # Terminal 2: Demo Store (port 3001)
   cd demo-store && PORT=3001 npm run dev
   
   # Terminal 3: Dashboard (port 3000, or use 3002)
   cd dashboard && PORT=3002 npm run dev
   ```
   
   **Production:** Create `.env.local`:
   ```bash
   NEXT_PUBLIC_DEMO_STORE_URL=https://your-demo-store.vercel.app
   NEXT_PUBLIC_DASHBOARD_URL=https://your-dashboard.vercel.app
   ```

3. Run development server:
```bash
npm run dev
```

## Deployment

Deploy to Vercel with root directory set to `marketing/`.

The CTAs will open the demo store and dashboard in new tabs. If URLs are not configured, they will show an alert message.

