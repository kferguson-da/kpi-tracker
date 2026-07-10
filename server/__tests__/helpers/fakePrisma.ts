import type { PrismaClient, User } from '@prisma/client';

export interface UserSeed {
  email: string;
  name?: string | null;
  isAdmin?: boolean;
}

// Minimal in-memory stand-in for PrismaClient covering only what the code under
// test touches. Real-DB integration tests arrive with the test-DB harness in
// Phase 3; until then this keeps api tests fast and offline.
export function makeFakePrisma(seed: UserSeed[] = []): {
  prisma: PrismaClient;
  users: Map<string, User>;
} {
  const users = new Map<string, User>();
  let counter = 0;

  const make = (email: string, name: string | null, isAdmin: boolean): User => ({
    id: `u_${++counter}`,
    email,
    name,
    isAdmin,
    createdAt: new Date(),
  });

  for (const s of seed) {
    const row = make(s.email, s.name ?? null, s.isAdmin ?? false);
    users.set(row.email, row);
  }

  const fake = {
    user: {
      async upsert(args: {
        where: { email: string };
        create: { email: string; isAdmin: boolean };
      }) {
        const existing = users.get(args.where.email);
        if (existing) return existing;
        const created = make(args.create.email, null, args.create.isAdmin);
        users.set(created.email, created);
        return created;
      },
      async findUnique(args: { where: { email: string } }) {
        return users.get(args.where.email) ?? null;
      },
    },
    async $disconnect() {
      // no-op
    },
  };

  return { prisma: fake as unknown as PrismaClient, users };
}
