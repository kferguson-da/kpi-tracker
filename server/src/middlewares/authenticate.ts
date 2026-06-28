import type { RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/env.js';
import { provisionUser } from '../models/user.model.js';
import { initialRoleForEmail } from '../utils/roles.js';
import { HttpError, unauthorized } from '../utils/httpError.js';

// Lazily build the remote JWKS once. jose caches the keys and refreshes them on
// rotation, so a single instance serves the whole process.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!config.auth.cfTeamDomain) {
    throw new Error('CF_ACCESS_TEAM_DOMAIN is not configured');
  }
  jwks ??= createRemoteJWKSet(new URL(`https://${config.auth.cfTeamDomain}/cdn-cgi/access/certs`));
  return jwks;
}

// Resolve the caller's verified email: the dev bypass (non-production only) or a
// verified Cloudflare Access JWT. Never trusts the header blindly; fails closed.
async function resolveEmail(token: string | undefined): Promise<string> {
  if (config.auth.devLoginEmail) {
    return config.auth.devLoginEmail;
  }
  if (!token) {
    throw unauthorized('Missing Cloudflare Access assertion');
  }
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://${config.auth.cfTeamDomain}`,
      audience: config.auth.cfAud ?? undefined,
    });
    if (typeof payload.email !== 'string' || !payload.email) {
      throw unauthorized('Access token has no email claim');
    }
    return payload.email;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw unauthorized('Invalid Cloudflare Access assertion');
  }
}

// App-wide guard for /api: verifies identity, auto-provisions first-time users,
// and attaches req.user. Every /api route runs behind this (see plan §4.2).
export const authenticate: RequestHandler = (req, _res, next) => {
  resolveEmail(req.header('Cf-Access-Jwt-Assertion'))
    .then(async (email) => {
      const user = await provisionUser(
        email,
        initialRoleForEmail(email, config.auth.seedAdminEmail),
      );
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    })
    .catch(next);
};
