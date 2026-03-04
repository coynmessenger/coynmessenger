import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[DB] DATABASE_URL is not set. Add it to deployment secrets. Database operations will fail until this is configured.');
}

export const pool = new Pool({ 
  connectionString: DATABASE_URL ?? 'postgresql://localhost/placeholder',
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Prevent unhandled 'error' events from crashing the process.
// Neon serverless will occasionally terminate idle connections with
// "terminating connection due to administrator command" — this is normal
// and the Pool automatically reconnects on the next query.
pool.on('error', (err) => {
  console.warn('DB pool connection error (will reconnect):', err.message);
});

export const db = drizzle({ client: pool, schema });

// Database health check and initialization
export async function initializeDatabase() {
  try {
    // Test database connection
    const result = await db.execute('SELECT 1 as test');
    
    return true;
  } catch (error) {
    
    // Don't throw here, let the app start with fallback
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  
  await pool.end();
  process.exit(0);
});