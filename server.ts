import 'dotenv/config';
import express from "express";
import cors from "cors";
import { initDb } from "./src/server/db.js";
import { apiRouter } from "./src/server/api.js";
import { initWs } from "./src/server/ws.js";
import path from "path";
import { createServer } from "http";

// === ENV VALIDATION ===
const required = ["GEMINI_API_KEY"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT ?? "3000", 10);

  // === CORS ===
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL ?? "",
  ].filter(Boolean);

  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // === BODY PARSING ===
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // === HEALTH CHECK (must be first) ===
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), ts: Date.now() });
  });

  // === DB + WS ===
  initDb();
  initWs(httpServer);

  console.log("SERVER START: GEMINI_API_KEY is:", process.env.GEMINI_API_KEY ? "Set" : "Not Set");

  // === ROUTES ===
  app.use("/api", apiRouter);

  // === STATIC / VITE ===
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve built frontend
    app.use(express.static(path.join(import.meta.dirname ?? __dirname, "dist")));

    // React Router fallback — must be LAST route
    app.get("*", (_req, res) => {
      res.sendFile(path.join(import.meta.dirname ?? __dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`ORI-CRUIT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
