import type { PrismaClient, Kpi } from '@prisma/client';

// The authenticated user attached to every request inside the /api scope.
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
  interface FastifyRequest {
    user?: AuthUser;
    kpi?: Kpi;
  }
}
