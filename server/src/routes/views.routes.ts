import type { FastifyInstance } from 'fastify';
import {
  archiveView,
  createView,
  deleteView,
  getView,
  listViews,
  restoreView,
  updateView,
} from '../controllers/view.controller';
import { requireAdmin, requireViewAccess, requireViewOwner } from '../hooks/authz';

export async function viewsRoutes(app: FastifyInstance) {
  app.post('/views', createView);
  app.get('/views', listViews);
  app.get('/views/:id', { preHandler: requireViewAccess }, getView);
  app.patch('/views/:id', { preHandler: requireViewOwner }, updateView);
  app.post('/views/:id/archive', { preHandler: requireViewOwner }, archiveView);
  app.post('/views/:id/restore', { preHandler: requireViewOwner }, restoreView);
  app.delete('/views/:id', { preHandler: requireAdmin }, deleteView);
}
