import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
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