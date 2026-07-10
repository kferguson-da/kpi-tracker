import type { Cadence, Comparator, Kpi, PrismaClient, Reading, Unit } from '@prisma/client';
import type { CreateKpiInput } from '../schemas/kpi.schema';

// How many recent readings to attach for the inline sparkline.
export const RECENT_READINGS = 8;

export type KpiWithReadings = Kpi & { readings: Reading[] };

const recentReadingsInclude = {
  readings: { orderBy: { periodKey: 'desc' }, take: RECENT_READINGS },
} as const;

export function createKpi(
  prisma: PrismaClient,
  ownerId: string,
  input: CreateKpiInput,
): Promise<Kpi> {
  return prisma.kpi.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      unit: input.unit,
      comparator: input.comparator,
      goal: input.goal,
      goalUpper: input.goalUpper ?? null,
      cadence: input.cadence,
      ownerId,
    },
  });
}

// Active (non-archived) KPIs the user can currently see. Admins see all; everyone
// else sees the ones they own. Phase 6 widens this to KPIs reachable through a
// View shared with the user.
export function listActiveKpisForUser(
  prisma: PrismaClient,
  userId: string,
  isAdmin: boolean,
): Promise<KpiWithReadings[]> {
  return prisma.kpi.findMany({
    where: { archivedAt: null, ...(isAdmin ? {} : { ownerId: userId }) },
    orderBy: { createdAt: 'desc' },
    include: recentReadingsInclude,
  });
}

// Plain lookup used by the authorization guards (no readings needed).
export function findKpiById(prisma: PrismaClient, id: string): Promise<Kpi | null> {
  return prisma.kpi.findUnique({ where: { id } });
}

// Lookup with the recent readings attached, for serialized responses.
export function findKpiWithReadings(
  prisma: PrismaClient,
  id: string,
): Promise<KpiWithReadings | null> {
  return prisma.kpi.findUnique({ where: { id }, include: recentReadingsInclude });
}

export interface KpiUpdateFields {
  name?: string;
  description?: string | null;
  unit?: Unit;
  comparator?: Comparator;
  goal?: number;
  goalUpper?: number | null;
  cadence?: Cadence;
}

export function updateKpi(prisma: PrismaClient, id: string, data: KpiUpdateFields): Promise<Kpi> {
  return prisma.kpi.update({ where: { id }, data });
}

export function setArchived(
  prisma: PrismaClient,
  id: string,
  archivedAt: Date | null,
): Promise<Kpi> {
  return prisma.kpi.update({ where: { id }, data: { archivedAt } });
}

export function deleteKpi(prisma: PrismaClient, id: string): Promise<Kpi> {
  return prisma.kpi.delete({ where: { id } });
}
