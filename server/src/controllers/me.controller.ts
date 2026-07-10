import type { FastifyRequest } from 'fastify';
import { currentUser } from '../plugins/auth';

// Returns the signed-in user. Route protection (401 when unauthenticated) is
// handled by the requireUser preHandler in the /api scope.
export async function getMe(request: FastifyRequest) {
  const { email, name, isAdmin } = currentUser(request);
  return { email, name, isAdmin };
}
