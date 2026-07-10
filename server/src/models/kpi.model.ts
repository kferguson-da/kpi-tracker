import type { Kpi, PrismaClient } from '@prisma/client';
import type { CreateKpiInput } from '../schemas/kpi.schema';

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
): Promise<Kpi[]> {
  return prisma.kpi.findMany({
    where: { archivedAt: null, ...(isAdmin ? {} : { ownerId: userId }) },
    orderBy: { createdAt: 'desc' },
  });
}

export function findKpiById(prisma: PrismaClient, id: string): Promise<Kpi | null> {
  return prisma.kpi.findUnique({ where: { id } });
}
