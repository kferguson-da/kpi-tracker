import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDb } from '../mocks/db.js';

const DEV_EMAIL = 'dev.user@dealershipaccelerator.io';

// Rebuild the app with a fresh module graph so config (loaded once at import)
// reflects the auth env this test wants. The PrismaClient lives on globalThis,
// so it survives resetModules and keeps a single connection pool.
async function buildApp(env: Record<string, string | undefined>): Promise<Express> {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  const { createApp } = await import('../../src/app.js');
  return createApp();
}

beforeEach(async () => {
  await resetDb();
  delete process.env.DEV_LOGIN_EMAIL;
  delete process.env.SEED_ADMIN_EMAIL;
});

afterEach(async () => {
  await resetDb();
});

describe('GET /api/me', () => {
  it('should_return_200_with_email_and_viewer_role_when_dev_login_set', async () => {
    const app = await buildApp({ NODE_ENV: 'test', DEV_LOGIN_EMAIL: DEV_EMAIL });

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: DEV_EMAIL, role: 'viewer' });
  });

  it('should_provision_admin_when_email_matches_seed_admin', async () => {
    const app = await buildApp({
      NODE_ENV: 'test',
      DEV_LOGIN_EMAIL: DEV_EMAIL,
      SEED_ADMIN_EMAIL: DEV_EMAIL,
    });

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: DEV_EMAIL, role: 'admin' });
  });

  it('should_return_401_when_no_assertion_and_no_dev_login', async () => {
    const app = await buildApp({ NODE_ENV: 'test' });

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
