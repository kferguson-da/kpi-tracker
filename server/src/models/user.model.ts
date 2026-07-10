import type { PrismaClient, User } from '@prisma/client';
import { initialUserFields } from '../utils/provisioning';

// Find the user by email, creating them on first sight. Admin is only decided at
// creation time; an existing user's flag is never changed here.
export function findOrCreateUser(
  prisma: PrismaClient,
  email: string,
  seedAdminEmail: string | null,
): Promise<User> {
  const fields = initialUserFields(email, seedAdminEmail);
  return prisma.user.upsert({
    where: { email: fields.email },
    update: {},
    create: fields,
  });
}
