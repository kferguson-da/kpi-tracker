import type { Role, User } from '@prisma/client';
import { prisma } from '../db/client.js';

// Data-access for users. Controllers and middleware call these functions; only
// this layer touches the Prisma client (see plan §3 layering rules).

// Idempotent first-login provisioning. upsert avoids a race when two concurrent
// requests arrive for a brand-new user; an existing user's role is left untouched.
export function provisionUser(email: string, roleIfNew: Role): Promise<User> {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: roleIfNew },
  });
}
