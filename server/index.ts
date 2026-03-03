import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { securityHeaders, corsOptions } from "./middleware/security";
import path from "path";

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

// Fast health-check — registered synchronously so it is available the instant
// the server binds, before DB init or route registration completes.
app.get('/', (_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(200).json({ status: 'ok' });
  }
  next();
});

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
// Async init: routes, DB, and Vite/static. Runs in the background while the
// server is already accepting health-check requests.
// ---------------------------------------------------------------------------
(async () => {
  try {
    await registerRoutes(app, server);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } catch (error) {
    console.error('[server] Initialization error (server still running):', error);
  }
})();
