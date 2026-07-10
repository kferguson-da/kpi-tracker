# Local development

## Prerequisites

- Node 24 (`.nvmrc`)
- PostgreSQL 16 running on `localhost:5432` (e.g. `brew services start postgresql@16`)

## One-time database setup

Create the dev role and database (matches `server/.env.example` and CI):

```bash
psql -d postgres -c "CREATE ROLE kpi LOGIN PASSWORD 'kpi';"
psql -d postgres -c "ALTER ROLE kpi CREATEDB;"   # needed for the migrate shadow DB
psql -d postgres -c "CREATE DATABASE kpi_tracker OWNER kpi;"
```

## Server

```bash
cd server
cp .env.example .env          # DATABASE_URL, DEV_LOGIN_EMAIL, SEED_ADMIN_EMAIL
npm install
npm run prisma:generate       # generate the typed client
npm run migrate:dev           # apply migrations to kpi_tracker
npm test                      # vitest unit + api (api tests use a fake Prisma; no DB needed)
npm run dev                   # API on http://localhost:3000
```

Smoke check:

```bash
curl localhost:3000/healthz                              # {"status":"ok"}
curl -H "x-dev-user: you@dealershipaccelerator.io" localhost:3000/api/me
```

Locally, identity comes from the `x-dev-user` header or `DEV_LOGIN_EMAIL` (no
Cloudflare Access in front). In production Cloudflare Access supplies it.

## Checks (mirror CI)

```bash
# from server/
npm run lint && npm run typecheck && npm test && npm run build
# from repo root
npm run format:check
```
