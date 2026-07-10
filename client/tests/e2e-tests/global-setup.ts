import { execSync } from 'node:child_process';
import path from 'node:path';

// Prepare an isolated e2e database: create it if missing, apply migrations, and
// start from a clean slate. Runs once before the suite.
const DB = 'kpi_tracker_e2e';
const PSQL_URL = `postgresql://kpi:kpi@localhost:5432/${DB}`;
const APP_URL = `${PSQL_URL}?schema=public`;

export default function globalSetup() {
  const exists = execSync(`psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'"`)
    .toString()
    .trim();
  if (exists !== '1') {
    execSync(`psql -d postgres -c "CREATE DATABASE ${DB} OWNER kpi"`, { stdio: 'inherit' });
  }

  const serverDir = path.resolve(process.cwd(), '../server');
  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: APP_URL },
    stdio: 'inherit',
  });

  execSync(
    `psql "${PSQL_URL}" -c "TRUNCATE view_accesses, view_kpis, readings, kpis, views, users RESTART IDENTITY CASCADE"`,
    { stdio: 'inherit' },
  );
}
