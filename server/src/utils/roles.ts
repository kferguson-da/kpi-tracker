import type { Role } from '@prisma/client';

// First-login role assignment: the configured seed admin becomes an admin;
// everyone else starts as a viewer and is elevated later by an admin. Pure and
// dependency-free so it can be unit-tested without env or a database.
export function initialRoleForEmail(email: string, seedAdminEmail: string | null): Role {
  if (seedAdminEmail && email.toLowerCase() === seedAdminEmail.toLowerCase()) {
    return 'admin';
  }
  return 'viewer';
}
