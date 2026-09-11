import './env';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Bound per-process connections: API, worker and QA must share the hosted pool.
// Keep explicit deployment settings; never print connection credentials.
const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (databaseUrl) {
  // Supabase's session endpoint reserves a server connection per client. Use
  // transaction pooling for runtime traffic; DIRECT_URL stays unchanged for CLI.
  if (databaseUrl.hostname.endsWith('.pooler.supabase.com') && databaseUrl.port === '5432' && process.env.SUPABASE_SESSION_MODE !== 'true') {
    databaseUrl.port = '6543';
    databaseUrl.searchParams.set('pgbouncer', 'true');
  }
  if (!databaseUrl.searchParams.has('connection_limit')) databaseUrl.searchParams.set('connection_limit', '3');
  if (!databaseUrl.searchParams.has('pool_timeout')) databaseUrl.searchParams.set('pool_timeout', '20');
  if (!databaseUrl.searchParams.has('connect_timeout')) databaseUrl.searchParams.set('connect_timeout', '10');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl.toString() } : {}),
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
