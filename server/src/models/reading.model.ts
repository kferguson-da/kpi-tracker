import type { PrismaClient, Reading } from '@prisma/client';

// Record a value for a period. One row per (kpi, period): re-recording the same
// period overwrites it; a backdated period never affects a more recent one.
export function upsertReading(
  prisma: PrismaClient,
  kpiId: string,
  periodKey: string,
  value: number,
  recordedById: string,
): Promise<Reading> {
  return prisma.reading.upsert({
    where: { kpiId_periodKey: { kpiId, periodKey } },
    update: { value, recordedById, recordedAt: new Date() },
    create: { kpiId, periodKey, value, recordedById },
  });
}

export type ReadingWithRecorder = Reading & { recordedBy: { email: string } };

// Full history for a KPI, newest period first, with who recorded each value.
export function listReadings(prisma: PrismaClient, kpiId: string): Promise<ReadingWithRecorder[]> {
  return prisma.reading.findMany({
    where: { kpiId },
    orderBy: { periodKey: 'desc' },
    include: { recordedBy: { select: { email: true } } },
  });
}
