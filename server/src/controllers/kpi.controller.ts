import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Kpi } from '@prisma/client';
import { currentUser } from '../plugins/auth';
import { currentKpi } from '../hooks/authz';
import { createKpiBody, updateKpiBody } from '../schemas/kpi.schema';
import { computeStatus } from '../utils/status';
import { goalRuleError } from '../utils/goalRule';
import { HttpError } from '../utils/httpError';
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

export async function updateKpi(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt !== null) {
    throw new HttpError(409, 'Cannot edit an archived KPI');
  }
  const patch = updateKpiBody.parse(request.body);

  // Validate the goal rule of the merged result. Switching away from between
  // clears the upper value; switching to between keeps the patch/current one.
  const comparator = patch.comparator ?? kpi.comparator;
  const goal = patch.goal ?? Number(kpi.goal);
  let goalUpper: number | null = null;
  if (comparator === 'BETWEEN') {
    goalUpper =
      patch.goalUpper !== undefined
        ? patch.goalUpper
        : kpi.goalUpper === null
          ? null
          : Number(kpi.goalUpper);
  }
  const error = goalRuleError(comparator, goal, goalUpper);
  if (error) {
    throw new HttpError(400, error);
  }

  const updated = await kpiModel.updateKpi(request.server.prisma, kpi.id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
    ...(patch.cadence !== undefined ? { cadence: patch.cadence } : {}),
    comparator,
    goal,
    goalUpper,
  });
  return serialize(updated);
}

export async function archiveKpi(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt !== null) {
    throw new HttpError(409, 'KPI is already archived');
  }
  const updated = await kpiModel.setArchived(request.server.prisma, kpi.id, new Date());
  return serialize(updated);
}

export async function restoreKpi(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt === null) {
    throw new HttpError(409, 'KPI is not archived');
  }
  const updated = await kpiModel.setArchived(request.server.prisma, kpi.id, null);
  return serialize(updated);
}

export async function deleteKpi(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const kpi = await kpiModel.findKpiById(request.server.prisma, id);
  if (!kpi) {
    throw new HttpError(404, 'KPI not found');
  }
  await kpiModel.deleteKpi(request.server.prisma, id);
  return reply.code(204).send();
}
