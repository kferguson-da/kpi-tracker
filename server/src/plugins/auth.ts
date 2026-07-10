import type { FastifyRequest } from 'fastify';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { findOrCreateUser } from '../models/user.model';
import type { AuthUser } from '../types';

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Resolve the caller's email. Locally we trust a dev header / env var; in
// production Cloudflare Access injects the authenticated email.
// TODO (Phase 12): verify the signed Cf-Access-Jwt-Assertion against the Access
// JWKS instead of trusting the plain header, and fail closed on any error.
export function resolveEmail(request: FastifyRequest): string | null {
  if (env.NODE_ENV !== 'production') {
    return headerValue(request.headers['x-dev-user']) ?? env.DEV_LOGIN_EMAIL ?? null;
  }
  return headerValue(request.headers['cf-access-authenticated-user-email']);
}

// preHandler: resolve identity and, when present, provision the user on first
// sight and attach them to the request. This does NOT reject on missing identity;
// enforcement is requireUser's job, keeping populate and protect separate.
export async function authenticate(request: FastifyRequest): Promise<void> {
  const email = resolveEmail(request);
  if (!email) {
    return;
  }

  const user = await findOrCreateUser(request.server.prisma, email, env.SEED_ADMIN_EMAIL ?? null);

  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  };
}

// preHandler: the route-protection guard. Rejects any request without an
// authenticated user. Runs after authenticate in the /api scope.
export async function requireUser(request: FastifyRequest): Promise<void> {
  if (!request.user) {
    throw new HttpError(401, 'Unauthorized');
  }
}

// Typed accessor for controllers: returns the authenticated user and narrows away
// the optional. Safe in any handler protected by the requireUser preHandler.
export function currentUser(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return request.user;
}
