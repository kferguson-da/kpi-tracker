import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';

// One PrismaClient per process. `tsx watch` reloads the module graph on each
// change in dev, so we stash the instance on globalThis to avoid spawning a new
// connection pool on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Verbose query logging only in interactive dev; quiet in test and prod.
    log: config.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}
