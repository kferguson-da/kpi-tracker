import { PrismaClient } from '@prisma/client';

// Lazily created singleton so importing this module never opens a connection
// (tests inject a fake Prisma and never call this).
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}
