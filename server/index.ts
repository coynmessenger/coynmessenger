import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { securityHeaders, corsOptions } from "./middleware/security";

// ---------------------------------------------------------------------------
// Logging — inline here so we never import the vite package in production.
// ---------------------------------------------------------------------------
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (keeping process alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (keeping process alive):', reason);
});

const app = express();

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Fast health-check — registered synchronously so it is available the instant
// the server binds, well before DB init or route registration completes.
// In development Vite takes over / to serve index.html.
// ---------------------------------------------------------------------------
app.get('/', (_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(200).json({ status: 'ok' });
  }
  next();
});

// ---------------------------------------------------------------------------
// Request logger
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      const sensitiveRoutes = ['/api/wallet', '/api/user', '/api/users'];
      if (capturedJsonResponse && !sensitiveRoutes.some(r => reqPath.startsWith(r))) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// ---------------------------------------------------------------------------
// Static asset serving
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    const inlineTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mp3', '.wav', '.ogg'];
    if (!inlineTypes.includes(ext)) res.setHeader('Content-Disposition', 'attachment');
  }
}));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'attached_assets', 'coynresize_1760204738870.png'));
});

// ---------------------------------------------------------------------------
// HTTP server — start listening immediately so the deployment health-checker
// gets a fast 200 from GET /. In dev, the previous process may still hold
// port 5000 briefly; we retry with backoff until it is free.
// ---------------------------------------------------------------------------
const server = createServer(app);
const PORT = 5000;

function bindServer(attempt = 1): void {
  server.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const delay = Math.min(500 * attempt, 3000);
      console.warn(`[server] port ${PORT} in use, retrying in ${delay}ms (attempt ${attempt})…`);
      setTimeout(() => bindServer(attempt + 1), delay);
    } else {
      console.error('[server] listen error:', err.message);
    }
  });
  server.listen({ port: PORT, host: '0.0.0.0' }, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

bindServer();

// ---------------------------------------------------------------------------
// Async init: routes, DB, and frontend serving.
// Runs in the background — the server already handles GET / during this time.
// ---------------------------------------------------------------------------
(async () => {
  try {
    await registerRoutes(app, server);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "development") {
      // Dynamic import keeps the vite package out of production entirely.
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
    } else {
      // Serve the pre-built frontend from dist/public (same dir as this file).
      const distPath = path.resolve(import.meta.dirname, "public");
      if (!fs.existsSync(distPath)) {
        console.error(`[server] Build directory not found: ${distPath}`);
      } else {
        app.use(express.static(distPath));
        app.use("*", (_req, res) => {
          res.sendFile(path.resolve(distPath, "index.html"));
        });
        log(`serving static files from ${distPath}`);
      }
    }
  } catch (error) {
    console.error('[server] Initialization error (server still running):', error);
  }
})();
