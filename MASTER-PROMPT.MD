You are a senior full-stack engineer. My project is ori-cruit-FINAL-HUB — a React + Express + SQLite + WebSocket + Gemini AI recruiting platform. The repo is open in this workspace. Work through every task below in strict order. For each task: show me the exact change, explain in one sentence why, then wait for me to confirm "done, next" before proceeding.

════════════════════════════════════════════════
PHASE 0 — SECURITY CLEANUP (do this first, non-negotiable)
════════════════════════════════════════════════

── TASK 0.1: Delete exposed artifacts ──
Run these commands in the terminal:

  git rm --cached env.json metadata.json
  git rm --cached test-env.js test-env-simple.js test-fetch.js test-fetch2.js test-fetch3.js test-vite-env.js test-vite.js

Then delete the actual files from disk:
  del env.json metadata.json test-env.js test-env-simple.js test-fetch.js test-fetch2.js test-fetch3.js test-vite-env.js test-vite.js

(Use rm instead of del if your terminal is bash/zsh)

── TASK 0.2: Update .gitignore ──
Open .gitignore. Add these lines at the bottom if not already present:

  env.json
  metadata.json
  test-*.js
  *.local
  data/
  *.db
  *.db-shm
  *.db-wal
  dist/
  .env

The data/ and *.db entries are critical — the SQLite database must never be committed.

── TASK 0.3: Commit the cleanup ──
  git add .gitignore
  git commit -m "security: remove exposed env artifacts and debug scripts"
  git push origin main

════════════════════════════════════════════════
PHASE 1 — CODE FIXES (prep for any deployment)
════════════════════════════════════════════════

── TASK 1.1: Fix package.json name ──
Open package.json. Change:
  "name": "react-example"
to:
  "name": "ori-cruit-hub"

── TASK 1.2: Fix duplicate Vite in dependencies ──
In package.json, remove vite from the "dependencies" section entirely.
Keep it only in "devDependencies". Vite is a build tool — it must not be a runtime dependency.

── TASK 1.3: Add CORS middleware ──
Run: npm install cors
Run: npm install --save-dev @types/cors

Open server.ts. Near the top, after the Express app is created, add:

  import cors from 'cors'

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL ?? '',
  ].filter(Boolean)

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }))

This is required so the Vercel-hosted frontend can call the Railway-hosted API without being blocked by the browser.

── TASK 1.4: Add .env validation on startup ──
At the top of server.ts, add this check so the server fails loudly instead of silently when GEMINI_API_KEY is missing:

  import 'dotenv/config'

  const required = ['GEMINI_API_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

── TASK 1.5: Make SQLite data path configurable ──
In server.ts, find where the SQLite database file path is defined (likely something like './data/oricruit.db' or similar).
Change it to read from an environment variable with a safe fallback:

  const DB_PATH = process.env.DB_PATH ?? './data/oricruit.db'

Then ensure the data directory is created if it doesn't exist:

  import { mkdirSync } from 'fs'
  import { dirname } from 'path'
  mkdirSync(dirname(DB_PATH), { recursive: true })

This makes the path work both locally and in Docker with a volume mount.

── TASK 1.6: Add a /health endpoint ──
In server.ts, add this route before any other routes:

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: Date.now() })
  })

Railway, Render, and Docker all use health checks. Without this, the platform doesn't know your server started successfully.

── TASK 1.7: Update .env.example ──
Replace the contents of .env.example with this complete, documented version:

  # ── Gemini AI (required) ──────────────────────────────
  # Get your key at: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY=your_gemini_api_key_here

  # ── Server ────────────────────────────────────────────
  NODE_ENV=development
  PORT=3000

  # ── Database ──────────────────────────────────────────
  # Local: ./data/oricruit.db
  # Docker: /app/data/oricruit.db (set via volume mount)
  DB_PATH=./data/oricruit.db

  # ── Frontend URL (for CORS) ───────────────────────────
  # Set to your Vercel URL in production
  # e.g. https://ori-cruit-hub.vercel.app
  FRONTEND_URL=http://localhost:5173

── TASK 1.8: Create your local .env ──
Run: cp .env.example .env
Tell me you've added your real GEMINI_API_KEY to .env before we continue.

── TASK 1.9: Test the app locally ──
Run: npm install
Run: npm run dev

Confirm the app opens at http://localhost:3000 with no console errors.
If there are TypeScript errors, paste them and I will fix them before continuing.

── TASK 1.10: Commit all code fixes ──
  git add package.json server.ts .env.example
  git commit -m "fix: cors, startup validation, sqlite path, health endpoint, package name, vite dep"
  git push origin main

════════════════════════════════════════════════
PHASE 2 — VERCEL DEPLOYMENT (frontend only)
════════════════════════════════════════════════

Context: Vercel cannot host Express, WebSockets, or SQLite — these require a persistent server.
The solution is a split deployment:
  • Frontend (React/Vite) → Vercel  (free, instant, global CDN)
  • Backend (Express + WS + SQLite) → Railway  (free tier, persistent, WebSocket-compatible)

── TASK 2.1: Create vercel.json ──
Create a new file at the project root called vercel.json:

  {
    "buildCommand": "vite build",
    "outputDirectory": "dist",
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ],
    "env": {
      "VITE_API_URL": "@vite_api_url"
    }
  }

This tells Vercel to build only the Vite frontend and serve it as a static SPA.

── TASK 2.2: Make the API URL configurable in the frontend ──
Search the frontend src/ directory for any hardcoded references to 'localhost:3000' or the Express API base URL.
Replace every occurrence with:

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

If there is an existing API client file (e.g. src/lib/api.ts or similar), centralise this constant there.
If one doesn't exist, create src/lib/api.ts with:

  export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  export const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000'

Then update all fetch() and WebSocket() calls across src/ to use these constants.

── TASK 2.3: Configure WebSocket URL separately ──
WebSocket connections cannot use HTTP URLs. Find all new WebSocket(...) instantiations in the frontend src/ code.
Replace any hardcoded ws:// or wss:// URLs with:

  const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000'
  const ws = new WebSocket(wsUrl)

── TASK 2.4: Deploy backend to Railway (get the URL for step 2.5) ──
Tell me step by step what I need to do on railway.app to:
1. Create a new Railway project from this GitHub repo
2. Set the required environment variables:
     GEMINI_API_KEY=my_real_key
     NODE_ENV=production
     PORT=3000
     DB_PATH=/app/data/oricruit.db
     FRONTEND_URL=https://ori-cruit-hub.vercel.app
3. Mount a persistent volume at /app/data so the SQLite database survives restarts
4. Set the start command to: node --experimental-strip-types server.ts
5. Confirm the /health endpoint returns 200

Once Railway gives me a URL (e.g. https://ori-cruit-hub-production.up.railway.app), I will use it in the next step.

── TASK 2.5: Connect Vercel to the Railway backend ──
Tell me step by step how to:
1. Go to vercel.com → New Project → import this GitHub repo
2. Set Framework Preset: Vite
3. Set Build Command: vite build
4. Set Output Directory: dist
5. Add these environment variables in the Vercel dashboard:
     VITE_API_URL = https://[my-railway-url]
     VITE_WS_URL = wss://[my-railway-url]
6. Deploy and confirm the live Vercel URL loads the app

── TASK 2.6: Update CORS on Railway after Vercel URL is known ──
Once Vercel gives me my URL (e.g. https://ori-cruit-hub.vercel.app), update the FRONTEND_URL environment variable in Railway to match that URL exactly.
This removes the CORS block between Vercel frontend and Railway backend.

── TASK 2.7: Add vercel.json and commit ──
  git add vercel.json src/lib/api.ts
  git commit -m "feat: vercel config, configurable API/WS URLs for split deployment"
  git push origin main

Vercel auto-redeploys on push. Confirm the live URL works end to end.

════════════════════════════════════════════════
PHASE 3 — DOCKERFILE (prep for Hostinger VPS)
════════════════════════════════════════════════

── TASK 3.1: Create Dockerfile ──
Create a file named Dockerfile at the project root:

  # ── Stage 1: Install dependencies and build frontend ──
  FROM node:22-alpine AS builder
  WORKDIR /app

  COPY package.json package-lock.json ./
  RUN npm ci --ignore-scripts

  COPY . .
  RUN npm run build

  # ── Stage 2: Production image ──
  FROM node:22-alpine AS production
  WORKDIR /app

  ENV NODE_ENV=production
  ENV PORT=3000
  ENV DB_PATH=/app/data/oricruit.db

  # Copy only production deps
  COPY package.json package-lock.json ./
  RUN npm ci --ignore-scripts --omit=dev

  # Copy server and built frontend
  COPY server.ts ./
  COPY --from=builder /app/dist ./dist

  # Persistent volume for SQLite
  VOLUME ["/app/data"]

  EXPOSE 3000

  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

  CMD ["node", "--experimental-strip-types", "server.ts"]

── TASK 3.2: Create docker-compose.yml ──
Create docker-compose.yml at the project root:

  services:
    app:
      build:
        context: .
        dockerfile: Dockerfile
      ports:
        - "3000:3000"
      environment:
        NODE_ENV: production
        PORT: "3000"
        DB_PATH: /app/data/oricruit.db
        GEMINI_API_KEY: ${GEMINI_API_KEY}
        FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
      volumes:
        - sqlite_data:/app/data
      restart: unless-stopped
      healthcheck:
        test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
        interval: 30s
        timeout: 5s
        retries: 3

  volumes:
    sqlite_data:

── TASK 3.3: Create nginx.conf ──
Create nginx.conf at the project root for VPS deployment:

  server {
    listen 80;
    server_name _;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/javascript image/svg+xml;

    # WebSocket proxy — must come before the general location block
    location /ws {
      proxy_pass http://app:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_read_timeout 86400s;
      proxy_send_timeout 86400s;
    }

    # API proxy
    location /api {
      proxy_pass http://app:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
      proxy_pass http://app:3000;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss:;" always;
  }

── TASK 3.4: Update docker-compose.yml to add nginx ──
Update docker-compose.yml to add the nginx service:

  services:
    nginx:
      image: nginx:alpine
      ports:
        - "80:80"
      volumes:
        - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      depends_on:
        app:
          condition: service_healthy
      restart: unless-stopped

    app:
      [keep everything from Task 3.2 — remove the ports: section since nginx handles routing]

  volumes:
    sqlite_data:

── TASK 3.5: Create deploy.sh ──
Create deploy.sh at the project root:

  #!/bin/bash
  set -e
  echo "Starting deploy at $(date)"
  cd /opt/ori-cruit-hub
  git pull origin main
  docker compose up -d --build
  docker image prune -f
  echo "Deploy complete at $(date)"
  docker compose ps

Run: chmod +x deploy.sh (on the VPS, not locally)

── TASK 3.6: Commit all infra files ──
  git add Dockerfile docker-compose.yml nginx.conf deploy.sh
  git commit -m "feat: Dockerfile, compose, nginx for Hostinger VPS deployment"
  git push origin main

════════════════════════════════════════════════
PHASE 4 — HOSTINGER VPS DEPLOYMENT
════════════════════════════════════════════════

── TASK 4.1: VPS setup commands ──
Give me the exact terminal commands to run on my Hostinger Ubuntu VPS to:
1. SSH in
2. Install Docker + Docker Compose v2
3. Open firewall ports 22, 80, 443
4. Clone the repo to /opt/ori-cruit-hub
5. Create the .env file with GEMINI_API_KEY and FRONTEND_URL

── TASK 4.2: Cloudflare SSL ──
Walk me through:
1. Adding my domain to Cloudflare (free plan)
2. Creating an A record pointing at the VPS IP with proxy ON
3. Setting SSL/TLS mode to "Full"
4. Updating FRONTEND_URL in the VPS .env to the real domain

── TASK 4.3: First deploy ──
  cd /opt/ori-cruit-hub
  docker compose up -d --build
  docker compose logs -f app

Confirm the health check passes and the app is live at the domain.

── TASK 4.4: Update Vercel VITE_API_URL ──
Once the VPS domain is confirmed, update these in Vercel dashboard:
  VITE_API_URL = https://yourdomain.com
  VITE_WS_URL  = wss://yourdomain.com/ws

And update FRONTEND_URL in the VPS .env to the Vercel URL.
Trigger a Vercel redeploy.

── TASK 4.5: Retire Railway ──
Once VPS is confirmed healthy:
1. Delete the Railway project
2. The Vercel frontend now calls the VPS backend
3. The split deployment is complete

════════════════════════════════════════════════
PHASE 5 — POST-DEPLOY HARDENING
════════════════════════════════════════════════

── TASK 5.1: Add basic API authentication ──
Add a simple API key middleware to server.ts to prevent anonymous access to all routes:

  const API_KEY = process.env.API_SECRET_KEY
  if (API_KEY) {
    app.use('/api', (req, res, next) => {
      const key = req.headers['x-api-key']
      if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' })
      next()
    })
  }

Add API_SECRET_KEY to .env.example with instructions to generate one:
  # Generate with: openssl rand -base64 32
  API_SECRET_KEY=

Update the frontend to send this key in all fetch() headers:
  headers: { 'x-api-key': import.meta.env.VITE_API_SECRET ?? '' }

And add VITE_API_SECRET to Vercel environment variables.

── TASK 5.2: Add GitHub Actions CI ──
Create .github/workflows/ci.yml:

  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'npm'
        - run: npm ci
        - run: npm run lint
        - run: npm run build
        - run: echo "Build succeeded"

── TASK 5.3: Final verification checklist ──
Generate a checklist for me to verify the complete deployment:

  [ ] env.json, metadata.json, test-*.js are gone from the repo
  [ ] npm run dev works locally with no errors
  [ ] Vercel URL loads the React app
  [ ] Vercel frontend successfully calls Railway (or VPS) API
  [ ] WebSocket real-time updates work in browser
  [ ] AI Legal Audit button triggers Gemini and returns a result
  [ ] Refreshing a sub-route on Vercel doesn't return 404
  [ ] /health endpoint returns {"status":"ok"} on the backend
  [ ] SQLite data persists after docker compose restart
  [ ] securityheaders.com scan shows B+ or higher on VPS domain

After all phases complete, suggest the next logical milestone: migrating SQLite to PostgreSQL using Prisma, matching the database layer already planned in ori-cruit-FullHub.