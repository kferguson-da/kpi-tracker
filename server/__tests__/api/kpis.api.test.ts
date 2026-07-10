import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { getTestPrisma, resetDb, disconnectTestPrisma } from '../helpers/testDb';

const OWNER = 'owner@da.io';
const OTHER = 'other@da.io';

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Lead Response Rate',
    unit: 'PERCENT',
    comparator: 'GTE',
    goal: 90,
    cadence: 'MONTHLY',
    ...overrides,
  };
}

function create(app: FastifyInstance, email: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/kpis',
    headers: { 'x-dev-user': email },
    payload: validBody(overrides),
  });
}

describe('KPIs API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ prisma: getTestPrisma(), logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('should_return_401_when_creating_without_identity', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/kpis', payload: validBody() });
    expect(res.statusCode).toBe(401);
  });

  it('should_create_a_kpi_with_no_data_status', async () => {
    const res = await create(app, OWNER);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      name: 'Lead Response Rate',
      unit: 'PERCENT',
      comparator: 'GTE',
      goal: 90,
      goalUpper: null,
      cadence: 'MONTHLY',
      currentValue: null,
      status: 'no_data',
    });
    expect(body.id).toBeDefined();
    expect(body.ownerId).toBeDefined();
  });

  it('should_return_400_when_name_is_empty', async () => {
    const res = await create(app, OWNER, { name: '' });
    expect(res.statusCode).toBe(400);
  });

  it('should_return_400_when_between_has_no_upper_value', async () => {
    const res = await create(app, OWNER, { comparator: 'BETWEEN' });
    expect(res.statusCode).toBe(400);
  });

  it('should_return_400_when_upper_value_not_greater_than_goal', async () => {
    const res = await create(app, OWNER, { comparator: 'BETWEEN', goal: 10, goalUpper: 5 });
    expect(res.statusCode).toBe(400);
  });

  it('should_return_400_when_upper_value_set_on_a_non_between_rule', async () => {
    const res = await create(app, OWNER, { goalUpper: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('should_list_only_the_callers_own_active_kpis', async () => {
    await create(app, OWNER, { name: 'A' });
    await create(app, OWNER, { name: 'B' });
    await create(app, OTHER, { name: 'C' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/kpis',
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    const names = (res.json() as Array<{ name: string }>).map((k) => k.name).sort();
    expect(names).toEqual(['A', 'B']);
  });

  it('should_get_the_callers_own_kpi_by_id', async () => {
    const created = (await create(app, OWNER)).json();
    const res = await app.inject({
      method: 'GET',
      url: `/api/kpis/${created.id}`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(created.id);
  });

  it('should_return_403_when_getting_another_users_kpi', async () => {
    const created = (await create(app, OWNER)).json();
    const res = await app.inject({
      method: 'GET',
      url: `/api/kpis/${created.id}`,
      headers: { 'x-dev-user': OTHER },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should_return_404_for_a_missing_kpi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/kpis/does-not-exist',
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(404);
  });
});
