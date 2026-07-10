import { PrismaClient } from '@prisma/client';

// A real Prisma client against the isolated test database (see setupEnv.ts).
// Shared across api test files; single-threaded vitest keeps them from racing.
let prisma: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// Wipe every table between tests so each test starts from a clean, known state.
export async function resetDb(): Promise<void> {
  await getTestPrisma().$executeRawUnsafe(
    'TRUNCATE TABLE "view_accesses","view_kpis","readings","kpis","views","users" RESTART IDENTITY CASCADE;',
  );
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
