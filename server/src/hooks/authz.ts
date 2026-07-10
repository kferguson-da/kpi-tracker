import type { FastifyRequest } from 'fastify';
import type { Kpi } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { currentUser } from '../plugins/auth';
import { findKpiById } from '../models/kpi.model';

// preHandler for /kpis/:id read routes: loads the KPI (404 if missing), checks the
// caller may see it, and attaches it to the request for the controller to reuse.
// Read access = owner or admin for now; Phase 6 widens it to KPIs reachable
// through a View shared with the user.
export async function requireKpiAccess(request: FastifyRequest): Promise<void> {
  const { id } = request.params as { id: string };
  const kpi = await findKpiById(request.server.prisma, id);
  if (!kpi) {
    throw new HttpError(404, 'KPI not found');
  }
  const user = currentUser(request);
  if (kpi.ownerId !== user.id && !user.isAdmin) {
    throw new HttpError(403, 'Forbidden');
  }
  request.kpi = kpi;
}

// Typed accessor for the KPI loaded by requireKpiAccess.
export function currentKpi(request: FastifyRequest): Kpi {
  if (!request.kpi) {
    throw new HttpError(500, 'KPI not loaded');
  }
  return request.kpi;
}
