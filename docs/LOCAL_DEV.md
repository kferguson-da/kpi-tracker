# Local Development

How to run the KPI Tracker on your machine. The app is a monorepo of two sibling
packages — `server/` (Express + Prisma API) and `client/` (React + Vite SPA) —
orchestrated by the root `package.json`.

## Prerequisites

- **Node 24+** (`node --version`). The repo pins `24` in `.nvmrc`.
- **PostgreSQL 16** running locally on `localhost:5432`.
  - macOS: `brew install postgresql@16 && brew services start postgresql@16`.

## 1. Install dependencies

Each package has its own `node_modules`; install all three from the repo root:

```bash
npm run install:all      # root + server + client
```

## 2. Create the databases

Create the `kpi` role and the dev + test databases. The role needs `CREATEDB` so
Prisma can create its shadow database during `migrate dev`.

```bash
psql -d postgres <<'SQL'
CREATE ROLE kpi LOGIN PASSWORD 'kpi';
ALTER ROLE kpi CREATEDB;
CREATE DATABASE kpi_tracker OWNER kpi;
CREATE DATABASE kpi_tracker_test OWNER kpi;
SQL
```

## 3. Configure the server environment

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`. For local work the defaults are fine, but set a dev login
so you can call the API without Cloudflare Access in front of it:

```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://kpi:kpi@localhost:5432/kpi_tracker?schema=public

# Dev-only: stands in for the Cloudflare Access JWT. Honored only when
# NODE_ENV != production. Match SEED_ADMIN_EMAIL to provision yourself as admin.
DEV_LOGIN_EMAIL=you@dealershipaccelerator.io
SEED_ADMIN_EMAIL=you@dealershipaccelerator.io
```

`.env` is gitignored. In production these values come from systemd/SSM, not a file.

## 4. Apply migrations

```bash
# Dev database — creates/updates tables from prisma/schema.prisma
npm --prefix server run prisma:migrate

# Test database — applies existing migrations (no new ones)
cd server && DATABASE_URL='postgresql://kpi:kpi@localhost:5432/kpi_tracker_test?schema=public' \
  npx prisma migrate deploy && cd ..
```

## 5. Run the app

```bash
npm run dev      # server on :3000, client on :5173 (concurrently)
```

Open **http://localhost:5173**. The SPA calls `/api/me`, which Vite proxies to the
API on `:3000`; you should see your email and role in the header. The first request
auto-provisions your user (admin if your email matches `SEED_ADMIN_EMAIL`).

Run either side alone with `npm run dev:server` or `npm run dev:client`.

## Testing

```bash
# Server
npm --prefix server run test:unit   # pure, fast, no DB
npm --prefix server run test:api    # Supertest against kpi_tracker_test, serial

# Client
npm --prefix client run test        # Vitest + Testing Library + MSW
```

API tests run against `kpi_tracker_test` and reset it between tests, so keep that
database migrated (step 4). They never load `server/.env` (`NODE_ENV=test` disables
it) to avoid pointing tests at the dev database.

## Checks before pushing (mirrors CI)

```bash
npm run lint
npm run typecheck
npm run format:check
npm test            # server unit + API, then client
```

## Troubleshooting

- **`P3014` / "could not create the shadow database"** — the `kpi` role lacks
  `CREATEDB`. Run `psql -d postgres -c 'ALTER ROLE kpi CREATEDB;'`.
- **`P3005` / "schema is not empty"** on the test DB — it has leftover tables. Drop
  and recreate its schema as the owner, then re-run `migrate deploy`:
  ```bash
  psql -d kpi_tracker_test -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION kpi;'
  ```
- **`Missing required environment variable: DATABASE_URL`** — `server/.env` is
  missing or `DATABASE_URL` is unset.
- **Port already in use** — change `PORT` (server) or pass `--port` to Vite; the
  proxy target lives in `client/vite.config.ts`.
