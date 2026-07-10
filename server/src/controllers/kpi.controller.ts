import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { AuthUser } from '../types';
import { currentUser } from '../plugins/auth';
import { currentKpi } from '../hooks/authz';
import { createKpiBody, updateKpiBody } from '../schemas/kpi.schema';
import { goalRuleError } from '../utils/goalRule';
import { HttpError } from '../utils/httpError';
import { serializeKpi } from '../serializers/kpi.serializer';
import * as kpiModel from '../models/kpi.model';

// Re-fetch a KPI with its recent readings and serialize it, so every response
// reflects the current value and status.
async function respondWithKpi(prisma: PrismaClient, id: string, viewer: AuthUser) {
  const kpi = await kpiModel.findKpiWithReadings(prisma, id);
  if (!kpi) {
    throw new HttpError(404, 'KPI not found');
  }
  return serializeKpi(kpi, viewer);
}

export async function createKpi(request: FastifyRequest, reply: FastifyReply) {
  const user = currentUser(request);
  const input = createKpiBody.parse(request.body);
  const kpi = await kpiModel.createKpi(request.server.prisma, user.id, input);
  reply.code(201);
  return respondWithKpi(request.server.prisma, kpi.id, user);
}

export async function listKpis(request: FastifyRequest) {
  const user = currentUser(request);
  const kpis = await kpiModel.listActiveKpisForUser(request.server.prisma, user.id, user.isAdmin);
  return kpis.map((kpi) => serializeKpi(kpi, user));
}

export async function getKpi(request: FastifyRequest) {
  return respondWithKpi(request.server.prisma, currentKpi(request).id, currentUser(request));
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

  await kpiModel.updateKpi(request.server.prisma, kpi.id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
    ...(patch.cadence !== undefined ? { cadence: patch.cadence } : {}),
    comparator,
    goal,
    goalUpper,
  });
  return respondWithKpi(request.server.prisma, kpi.id, currentUser(request));
}

export async function archiveKpi(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt !== null) {
    throw new HttpError(409, 'KPI is already archived');
  }
  await kpiModel.setArchived(request.server.prisma, kpi.id, new Date());
  return respondWithKpi(request.server.prisma, kpi.id, currentUser(request));
}

export async function restoreKpi(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt === null) {
    throw new HttpError(409, 'KPI is not archived');
  }
  await kpiModel.setArchived(request.server.prisma, kpi.id, null);
  return respondWithKpi(request.server.prisma, kpi.id, currentUser(request));
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
