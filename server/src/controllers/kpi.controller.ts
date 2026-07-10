import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Kpi } from '@prisma/client';
import { currentUser } from '../plugins/auth';
import { currentKpi } from '../hooks/authz';
import { createKpiBody } from '../schemas/kpi.schema';
import { computeStatus } from '../utils/status';
import * as kpiModel from '../models/kpi.model';

// Serialize a KPI for the API: Decimal goals as numbers, plus the computed status.
// Readings arrive in Phase 4, so currentValue is null (status = no_data) for now.
function serialize(kpi: Kpi) {
  const goal = Number(kpi.goal);
  const goalUpper = kpi.goalUpper === null ? null : Number(kpi.goalUpper);
  const currentValue: number | null = null;
  return {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description,
    unit: kpi.unit,
    comparator: kpi.comparator,
    goal,
    goalUpper,
    cadence: kpi.cadence,
    ownerId: kpi.ownerId,
    archivedAt: kpi.archivedAt,
    createdAt: kpi.createdAt,
    currentValue,
    status: computeStatus(kpi.comparator, goal, goalUpper, currentValue),
  };
}

export async function createKpi(request: FastifyRequest, reply: FastifyReply) {
  const user = currentUser(request);
  const input = createKpiBody.parse(request.body);
  const kpi = await kpiModel.createKpi(request.server.prisma, user.id, input);
  reply.code(201);
  return serialize(kpi);
}

export async function listKpis(request: FastifyRequest) {
  const user = currentUser(request);
  const kpis = await kpiModel.listActiveKpisForUser(request.server.prisma, user.id, user.isAdmin);
  return kpis.map(serialize);
}

export async function getKpi(request: FastifyRequest) {
  return serialize(currentKpi(request));
}
