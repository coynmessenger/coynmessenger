import { Request, Response, NextFunction } from 'express';

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.thirdweb.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' wss: https:; " +
      "media-src 'self' blob:; " +
      "frame-src 'self' https://*.thirdweb.com https://*.walletconnect.com https://*.walletconnect.org; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    );
  }

  next();
};

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.includes('.replit.dev') ||
      origin.includes('.repl.co') ||
      origin.includes('.replit.app') ||
      origin === 'http://localhost:5000' ||
      origin === 'http://0.0.0.0:5000';

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string) => {
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  next();
};

// File upload security
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();

  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'
  ];

  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only images, videos, and PDFs are allowed'
    });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large',
      message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
    });
  }

  next();
};

// Authentication check
export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
};