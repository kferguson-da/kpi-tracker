import type { FastifyRequest } from 'fastify';
import type { Kpi, View } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { currentUser } from '../plugins/auth';
import { findKpiById } from '../models/kpi.model';
import { findViewById, hasViewGrant } from '../models/view.model';

// preHandler for /kpis/:id read routes: loads the KPI (404 if missing), checks the
// caller may see it, and attaches it to the request for the controller to reuse.
// Read access = owner or admin for now; Phase 6 widens it to KPIs reachable
// through a View shared with the user.
async function loadKpi(request: FastifyRequest): Promise<Kpi> {
  const { id } = request.params as { id: string };
  const kpi = await findKpiById(request.server.prisma, id);
  if (!kpi) {
    throw new HttpError(404, 'KPI not found');
  }
  request.kpi = kpi;
  return kpi;
}

export async function requireKpiAccess(request: FastifyRequest): Promise<void> {
  const kpi = await loadKpi(request);
  const user = currentUser(request);
  // Read access: owner or admin. Phase 6 widens this to KPIs reachable through a
  // View shared with the user.
  if (kpi.ownerId !== user.id && !user.isAdmin) {
    throw new HttpError(403, 'Forbidden');
  }
}

// Write guard: only the owner (or an admin) may mutate a KPI. Unlike read access,
// this never widens to View viewers.
export async function requireKpiOwner(request: FastifyRequest): Promise<void> {
  const kpi = await loadKpi(request);
  const user = currentUser(request);
  if (kpi.ownerId !== user.id && !user.isAdmin) {
    throw new HttpError(403, 'Forbidden');
  }
}

// Guard for app-admin-only actions (e.g. hard delete).
export async function requireAdmin(request: FastifyRequest): Promise<void> {
  if (!currentUser(request).isAdmin) {
    throw new HttpError(403, 'Forbidden');
  }
}

async function loadView(request: FastifyRequest): Promise<View> {
  const { id } = request.params as { id: string };
  const view = await findViewById(request.server.prisma, id);
  if (!view) {
    throw new HttpError(404, 'View not found');
  }
  request.view = view;
  return view;
}

// Read access to a View: owner, admin, or someone it is shared with.
export async function requireViewAccess(request: FastifyRequest): Promise<void> {
  const view = await loadView(request);
  const user = currentUser(request);
  if (view.ownerId === user.id || user.isAdmin) {
    return;
  }
  if (await hasViewGrant(request.server.prisma, view.id, user.id)) {
    return;
  }
  throw new HttpError(403, 'Forbidden');
}

// Write guard: only the owner (or an admin) may mutate a View or its sharing.
export async function requireViewOwner(request: FastifyRequest): Promise<void> {
  const view = await loadView(request);
  const user = currentUser(request);
  if (view.ownerId !== user.id && !user.isAdmin) {
    throw new HttpError(403, 'Forbidden');
  }
}

export function currentView(request: FastifyRequest): View {
  if (!request.view) {
    throw new HttpError(500, 'View not loaded');
  }
  return request.view;
}

// Typed accessor for the KPI loaded by requireKpiAccess.
export function currentKpi(request: FastifyRequest): Kpi {
  if (!request.kpi) {
    throw new HttpError(500, 'KPI not loaded');
  }
  return request.kpi;
}
