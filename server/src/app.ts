import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from './config/env';
import { prismaPlugin } from './plugins/prisma';
import { authenticate, requireUser } from './plugins/auth';
import { healthRoutes } from './routes/health.routes';
import { meRoutes } from './routes/me.routes';
import { kpisRoutes } from './routes/kpis.routes';
import { viewsRoutes } from './routes/views.routes';
import { HttpError } from './utils/httpError';
import './types';

export interface BuildAppOptions {
  prisma?: PrismaClient;
  logger?: boolean;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? env.NODE_ENV !== 'test',
  });

  await app.register(prismaPlugin, { prisma: opts.prisma });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({ error: { message: 'Validation failed', details: error.issues } });
      return;
    }

    const statusCode =
      error instanceof HttpError
        ? error.statusCode
        : typeof error.statusCode === 'number'
          ? error.statusCode
          : 500;

    if (statusCode >= 500) {
      request.log.error(error);
    }

    reply.code(statusCode).send({
      error: { message: statusCode < 500 ? error.message : 'Internal Server Error' },
    });
  });

  // Public routes.
  await app.register(healthRoutes);

  // Authenticated scope: everything under /api requires an identity.
  await app.register(
    async (instance) => {
      // Route protection is done with preHandler hooks: authenticate populates
      // request.user, requireUser rejects anyone who is not signed in. Per-resource
      // ownership guards (requireKpiOwner, etc.) are added to their routes later.
      instance.addHook('preHandler', authenticate);
      instance.addHook('preHandler', requireUser);
      await instance.register(meRoutes);
      await instance.register(kpisRoutes);
      await instance.register(viewsRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
