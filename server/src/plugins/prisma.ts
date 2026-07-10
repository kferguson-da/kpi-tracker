import fp from 'fastify-plugin';
import type { PrismaClient } from '@prisma/client';
import { getPrisma } from '../db/client';

export interface PrismaPluginOptions {
  prisma?: PrismaClient;
}

// Decorates the instance with `app.prisma`. Tests pass their own client; in that
// case we do not disconnect it on close (the test owns its lifecycle).
export const prismaPlugin = fp<PrismaPluginOptions>(async (app, opts) => {
  const injected = opts.prisma !== undefined;
  const prisma = opts.prisma ?? getPrisma();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    if (!injected) {
      await prisma.$disconnect();
    }
  });
});
