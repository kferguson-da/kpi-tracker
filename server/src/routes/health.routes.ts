import type { FastifyInstance } from 'fastify';

// Public liveness check. Registered outside the authenticated scope.
export async function healthRoutes(app: FastifyInstance) {
  app.get('/healthz', async () => ({ status: 'ok' }));
}
