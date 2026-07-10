import type { FastifyInstance } from 'fastify';
import {
  archiveKpi,
  createKpi,
  deleteKpi,
  getKpi,
  listKpis,
  restoreKpi,
  updateKpi,
} from '../controllers/kpi.controller';
import { requireAdmin, requireKpiAccess, requireKpiOwner } from '../hooks/authz';

export async function kpisRoutes(app: FastifyInstance) {
  app.post('/kpis', createKpi);
  app.get('/kpis', listKpis);
  app.get('/kpis/:id', { preHandler: requireKpiAccess }, getKpi);
  app.patch('/kpis/:id', { preHandler: requireKpiOwner }, updateKpi);
  app.post('/kpis/:id/archive', { preHandler: requireKpiOwner }, archiveKpi);
  app.post('/kpis/:id/restore', { preHandler: requireKpiOwner }, restoreKpi);
  app.delete('/kpis/:id', { preHandler: requireAdmin }, deleteKpi);
}
