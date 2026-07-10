import type { FastifyInstance } from 'fastify';
import { getMe } from '../controllers/me.controller';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', getMe);
}
