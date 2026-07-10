import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { makeFakePrisma } from '../helpers/fakePrisma';

describe('GET /healthz', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { prisma } = makeFakePrisma();
    app = await buildApp({ prisma, logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_ok_without_authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
