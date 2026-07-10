# KPI Tracker

Internal Dealership Accelerator tool for tracking KPIs, grouping them into Views, and controlling
access to Views. See `docs/` for the PRD, UI design, architecture, and implementation plan.

## Layout

- `server/` — Fastify + TypeScript API, Prisma, Aurora (PostgreSQL).
- `client/` — React + TypeScript SPA (added in a later phase).
- `infra/` — Terraform (added in a later phase).
- `docs/` — product and technical docs.

## Quick start (server)

```bash
cd server
cp .env.example .env        # set DEV_LOGIN_EMAIL and (later) DATABASE_URL
npm install
npm run prisma:generate
npm test                    # unit + api (no DB required yet; api tests use a fake Prisma)
npm run dev                 # starts the API on PORT (default 3000)
```

See `docs/IMPLEMENTATION_PLAN.md` for the phased build order.
