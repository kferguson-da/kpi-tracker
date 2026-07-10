import type { FastifyInstance } from 'fastify';
import { createKpi, getKpi, listKpis } from '../controllers/kpi.controller';
import { requireKpiAccess } from '../hooks/authz';

export async function kpisRoutes(app: FastifyInstance) {
  app.post('/kpis', createKpi);
  app.get('/kpis', listKpis);
  app.get('/kpis/:id', { preHandler: requireKpiAccess }, getKpi);
}
