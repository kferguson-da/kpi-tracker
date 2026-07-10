import type { FastifyRequest } from 'fastify';
import { currentUser } from '../plugins/auth';
import { currentKpi } from '../hooks/authz';
import { createReadingBody } from '../schemas/reading.schema';
import { periodKeyError } from '../utils/period';
import { HttpError } from '../utils/httpError';
import { serializeKpi } from '../serializers/kpi.serializer';
import * as readingModel from '../models/reading.model';
import * as kpiModel from '../models/kpi.model';

// Record (or overwrite) the value for a period, then return the updated KPI so the
// caller sees the new current value and status.
export async function createReading(request: FastifyRequest) {
  const kpi = currentKpi(request);
  if (kpi.archivedAt !== null) {
    throw new HttpError(409, 'Cannot record a value for an archived KPI');
  }

  const { periodKey, value } = createReadingBody.parse(request.body);
  const error = periodKeyError(kpi.cadence, periodKey);
  if (error) {
    throw new HttpError(400, error);
  }

  await readingModel.upsertReading(
    request.server.prisma,
    kpi.id,
    periodKey,
    value,
    currentUser(request).id,
  );

  const updated = await kpiModel.findKpiWithReadings(request.server.prisma, kpi.id);
  if (!updated) {
    throw new HttpError(500, 'KPI not found after recording');
  }
  return serializeKpi(updated, currentUser(request));
}

export async function listReadings(request: FastifyRequest) {
  const kpi = currentKpi(request);
  const readings = await readingModel.listReadings(request.server.prisma, kpi.id);
  return readings.map((r) => ({
    periodKey: r.periodKey,
    value: Number(r.value),
    recordedAt: r.recordedAt,
    recordedBy: r.recordedBy.email,
  }));
}
