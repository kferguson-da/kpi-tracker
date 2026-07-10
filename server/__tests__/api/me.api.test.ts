import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { makeFakePrisma } from '../helpers/fakePrisma';

describe('GET /api/me', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { prisma } = makeFakePrisma();
    app = await buildApp({ prisma, logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_401_when_no_identity_is_present', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
  });

  it('should_return_the_provisioned_user_when_dev_identity_is_present', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { 'x-dev-user': 'rep@da.io' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ email: 'rep@da.io', name: null, isAdmin: false });
  });
});
