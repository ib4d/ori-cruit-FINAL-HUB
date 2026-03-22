import express from "express";
import { initDb } from "./src/server/db.js";
import { apiRouter } from "./src/server/api.js";
import { initWs } from "./src/server/ws.js";
import path from "path";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  // Parse JSON bodies with increased limit for large chat exports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
