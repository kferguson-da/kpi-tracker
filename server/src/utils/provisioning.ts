export interface NewUserFields {
  email: string;
  isAdmin: boolean;
}

// First-login provisioning: normalize the email and flag app-admin only when it
// matches the configured seed admin. Pure and dependency-free so it can be
// unit-tested without env or a database.
export function initialUserFields(email: string, seedAdminEmail: string | null): NewUserFields {
  const normalized = email.trim().toLowerCase();
  const isAdmin = seedAdminEmail !== null && normalized === seedAdminEmail.trim().toLowerCase();
  return { email: normalized, isAdmin };
}
