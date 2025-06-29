import { Request, Response } from 'express';
import { db } from './db.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    memory: {
      used: string;
      free: string;
      total: string;
    };
  };
  errors?: string[];
}

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const errors: string[] = [];
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

  // Check database connection
  try {
    await db.execute('SELECT 1');
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  const formatBytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;

  const healthResult: HealthCheckResult = {
    status: errors.length === 0 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbStatus,
      memory: {
        used: formatBytes(memUsage.heapUsed),
        free: formatBytes(memUsage.heapTotal - memUsage.heapUsed),
        total: formatBytes(memUsage.heapTotal)
      }
    },
    ...(errors.length > 0 && { errors })
  };

  const statusCode = healthResult.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthResult);
};

// Simple readiness check for load balancers
export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error instanceof Error ? error.message : 'Database connection failed' 
    });
  }
};

// Liveness check for container orchestration
export const livenessCheck = (req: Request, res: Response): void => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
};