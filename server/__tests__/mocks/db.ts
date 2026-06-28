import { prisma } from '../../src/db/client.js';

// Centralized test-database reset. Add tables here as the schema grows so every
// API test starts from a clean, isolated state (see universal-testing.md §3).
export async function resetDb(): Promise<void> {
  await prisma.user.deleteMany();
}

export { prisma };
