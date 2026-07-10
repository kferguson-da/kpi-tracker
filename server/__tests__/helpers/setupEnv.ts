// Runs before test modules import config/env. Makes the test environment
// hermetic and safe:
// - Force the isolated test database so tests never touch the dev DB, even if a
//   local .env (loaded by Vitest) points DATABASE_URL at kpi_tracker.
// - Clear identity env so only the `x-dev-user` header establishes who is calling.
// The URL matches the CI Postgres service (localhost:5432, kpi/kpi, *_test).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://kpi:kpi@localhost:5432/kpi_tracker_test?schema=public';
delete process.env.DEV_LOGIN_EMAIL;
delete process.env.SEED_ADMIN_EMAIL;
