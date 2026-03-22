import express from "express";
import cors from 'cors';
import 'dotenv/config';
import { initDb } from "./src/server/db.ts";
import { apiRouter } from "./src/server/api.ts";
import { initWs } from "./src/server/ws.ts";
import path from "path";
import { createServer } from "http";

async function startServer() {
  const required = ['GEMINI_API_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const app = express();
  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT || '3000', 10);

  const allowedOrigins = [
    `http://localhost:${PORT}`,
    'http://localhost:5173',
    'http://localhost:3001',
    process.env.FRONTEND_URL ?? '',
  ].filter(Boolean)

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }))

  // Parse JSON bodies with increased limit for large chat exports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: Date.now() })
  })

  // Initialize SQLite Database
  initDb();

  // Initialize WebSockets
  initWs(httpServer);

  console.log("SERVER START: GEMINI_API_KEY is:", process.env.GEMINI_API_KEY ? "Set" : "Not Set");

  // Mount API routes FIRST
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`ORI-CRUIT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
