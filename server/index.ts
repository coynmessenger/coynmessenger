import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { securityHeaders, corsOptions } from "./middleware/security";

// Prevent transient errors (e.g. Neon DB connection resets, RPC timeouts)
// from killing the production process entirely.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (keeping process alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (keeping process alive):', reason);
});

const app = express();

// Trust the first proxy (Replit's load balancer) so express-rate-limit
// correctly identifies client IPs from X-Forwarded-For headers.
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(securityHeaders);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Fast health check for deployment — responds immediately before any async init.
// In development this is skipped so Vite serves index.html at /.
app.get('/', (_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(200).json({ status: 'ok' });
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      const sensitiveRoutes = ['/api/wallet', '/api/user', '/api/users'];
      const isSensitive = sensitiveRoutes.some(r => path.startsWith(r));

      if (capturedJsonResponse && !isSensitive) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    const inlineTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mp3', '.wav', '.ogg'];
    if (!inlineTypes.includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// Serve attached_assets for favicon and other static assets
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve favicon.ico from attached_assets
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'attached_assets', 'coynresize_1760204738870.png'));
});

function startListening(server: ReturnType<typeof createServer>, port: number, attempt = 1): void {
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attempt < 5) {
      // Port still held by previous process (common during dev hot-reload).
      // Remove the listener so we can retry cleanly.
      server.removeAllListeners('error');
      server.close(() => {
        setTimeout(() => startListening(server, port, attempt + 1), 500 * attempt);
      });
    } else {
      console.error('Server listen error:', err.message);
    }
  });
}

(async () => {
  try {
    // Create the HTTP server and start listening BEFORE heavy async init so
    // the deployment health checker gets a fast 200 response at /.
    const server = createServer(app);
    const port = 5000;
    startListening(server, port);

    await registerRoutes(app, server);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } catch (error) {
    console.error('Server initialization error (server still running):', error);
  }
})();
