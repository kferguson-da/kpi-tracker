import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { getTestPrisma, resetDb, disconnectTestPrisma } from '../helpers/testDb';

const OWNER = 'owner@da.io';
const OTHER = 'other@da.io';

function createKpi(app: FastifyInstance, email: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/kpis',
    headers: { 'x-dev-user': email },
    payload: {
      name: 'Lead Response Rate',
      unit: 'PERCENT',
      comparator: 'GTE',
      goal: 90,
      cadence: 'MONTHLY',
      ...overrides,
    },
  });
}

function record(app: FastifyInstance, email: string, id: string, periodKey: string, value: number) {
  return app.inject({
    method: 'POST',
    url: `/api/kpis/${id}/readings`,
    headers: { 'x-dev-user': email },
    payload: { periodKey, value },
  });
}

describe('Readings API', () => {
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

  it('should_record_a_value_and_return_the_computed_status', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    const res = await record(app, OWNER, kpi.id, '2026-06', 94);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ currentValue: 94, status: 'green' });
    expect(body.recentReadings).toEqual([{ periodKey: '2026-06', value: 94 }]);
  });

  it('should_use_the_latest_period_as_the_current_value', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    await record(app, OWNER, kpi.id, '2026-04', 80);
    await record(app, OWNER, kpi.id, '2026-06', 92);
    const res = await record(app, OWNER, kpi.id, '2026-05', 100); // backdated between the two
    const body = res.json();
    expect(body.currentValue).toBe(92); // June is still latest
    expect(body.recentReadings.map((r: { periodKey: string }) => r.periodKey)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
  });

  it('should_overwrite_when_recording_the_same_period_twice', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    await record(app, OWNER, kpi.id, '2026-06', 80);
    const res = await record(app, OWNER, kpi.id, '2026-06', 95);
    expect(res.json().currentValue).toBe(95);
    const history = await app.inject({
      method: 'GET',
      url: `/api/kpis/${kpi.id}/readings`,
      headers: { 'x-dev-user': OWNER },
    });
    expect((history.json() as unknown[]).length).toBe(1);
  });

  it('should_return_400_for_a_period_key_that_does_not_match_the_cadence', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    const res = await record(app, OWNER, kpi.id, '2026-W26', 94); // weekly key on a monthly KPI
    expect(res.statusCode).toBe(400);
  });

  it('should_return_403_when_a_non_owner_records', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    const res = await record(app, OTHER, kpi.id, '2026-06', 94);
    expect(res.statusCode).toBe(403);
  });

  it('should_return_409_when_recording_on_an_archived_kpi', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    await app.inject({
      method: 'POST',
      url: `/api/kpis/${kpi.id}/archive`,
      headers: { 'x-dev-user': OWNER },
    });
    const res = await record(app, OWNER, kpi.id, '2026-06', 94);
    expect(res.statusCode).toBe(409);
  });

  it('should_return_full_history_newest_first_with_recorder', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    await record(app, OWNER, kpi.id, '2026-05', 88);
    await record(app, OWNER, kpi.id, '2026-06', 92);
    const res = await app.inject({
      method: 'GET',
      url: `/api/kpis/${kpi.id}/readings`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as Array<{ periodKey: string; value: number; recordedBy: string }>;
    expect(rows.map((r) => r.periodKey)).toEqual(['2026-06', '2026-05']);
    expect(rows[0]?.recordedBy).toBe(OWNER);
  });

  it('should_list_the_kpi_with_its_current_value_after_recording', async () => {
    const kpi = (await createKpi(app, OWNER)).json();
    await record(app, OWNER, kpi.id, '2026-06', 70);
    const list = await app.inject({
      method: 'GET',
      url: '/api/kpis',
      headers: { 'x-dev-user': OWNER },
    });
    const found = (list.json() as Array<{ id: string; currentValue: number; status: string }>).find(
      (k) => k.id === kpi.id,
    );
    expect(found?.currentValue).toBe(70);
    expect(found?.status).toBe('red'); // 70 vs goal >= 90 is more than 10% below
  });
});
