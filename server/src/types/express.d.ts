import type { Role } from '@prisma/client';

// Identity attached by the authenticate middleware, available on every /api route.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

export {};
