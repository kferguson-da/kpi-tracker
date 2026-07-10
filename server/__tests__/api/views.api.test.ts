import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { getTestPrisma, resetDb, disconnectTestPrisma } from '../helpers/testDb';

const OWNER = 'owner@da.io';
const OTHER = 'other@da.io';
const ADMIN = 'admin@da.io';

function createView(app: FastifyInstance, email: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/views',
    headers: { 'x-dev-user': email },
    payload: { name: 'BDC Scorecard', ...overrides },
  });
}

describe('Views API', () => {
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
    const res = await app.inject({ method: 'POST', url: '/api/views', payload: { name: 'X' } });
    expect(res.statusCode).toBe(401);
  });

  it('should_create_a_view_owned_by_the_caller', async () => {
    const res = await createView(app, OWNER, { description: 'BDC metrics' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      name: 'BDC Scorecard',
      description: 'BDC metrics',
      role: 'owner',
    });
  });

  it('should_return_400_when_name_is_empty', async () => {
    const res = await createView(app, OWNER, { name: '' });
    expect(res.statusCode).toBe(400);
  });

  it('should_list_only_the_callers_own_active_views', async () => {
    await createView(app, OWNER, { name: 'A' });
    await createView(app, OWNER, { name: 'B' });
    await createView(app, OTHER, { name: 'C' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/views',
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    const names = (res.json() as Array<{ name: string }>).map((v) => v.name).sort();
    expect(names).toEqual(['A', 'B']);
  });

  it('should_return_an_empty_shared_list_before_any_grants', async () => {
    await createView(app, OTHER, { name: 'Exec Weekly' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/views?filter=shared',
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('should_get_the_callers_own_view', async () => {
    const created = (await createView(app, OWNER)).json();
    const res = await app.inject({
      method: 'GET',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(created.id);
  });

  it('should_return_403_when_getting_an_unshared_view', async () => {
    const created = (await createView(app, OWNER)).json();
    const res = await app.inject({
      method: 'GET',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OTHER },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should_return_404_for_a_missing_view', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/views/does-not-exist',
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should_update_a_view_as_owner', async () => {
    const created = (await createView(app, OWNER)).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OWNER },
      payload: { name: 'Renamed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Renamed');
  });

  it('should_return_403_when_updating_another_users_view', async () => {
    const created = (await createView(app, OWNER)).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OTHER },
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should_archive_hide_from_the_list_then_restore', async () => {
    const created = (await createView(app, OWNER)).json();

    const archived = await app.inject({
      method: 'POST',
      url: `/api/views/${created.id}/archive`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().archivedAt).not.toBeNull();

    const list = await app.inject({
      method: 'GET',
      url: '/api/views',
      headers: { 'x-dev-user': OWNER },
    });
    expect((list.json() as unknown[]).length).toBe(0);

    const restored = await app.inject({
      method: 'POST',
      url: `/api/views/${created.id}/restore`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().archivedAt).toBeNull();
  });

  it('should_return_409_when_editing_an_archived_view', async () => {
    const created = (await createView(app, OWNER)).json();
    await app.inject({
      method: 'POST',
      url: `/api/views/${created.id}/archive`,
      headers: { 'x-dev-user': OWNER },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OWNER },
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('should_hard_delete_as_admin', async () => {
    await getTestPrisma().user.create({ data: { email: ADMIN, isAdmin: true } });
    const created = (await createView(app, OWNER)).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': ADMIN },
    });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({
      method: 'GET',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': ADMIN },
    });
    expect(get.statusCode).toBe(404);
  });

  it('should_return_403_when_a_non_admin_owner_hard_deletes', async () => {
    const created = (await createView(app, OWNER)).json();
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/views/${created.id}`,
      headers: { 'x-dev-user': OWNER },
    });
    expect(res.statusCode).toBe(403);
  });
});
