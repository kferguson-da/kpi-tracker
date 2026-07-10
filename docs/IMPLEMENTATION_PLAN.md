# KPI Tracker — Implementation Plan

|                  |                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Status**       | Draft v2                                                                                               |
| **Owner**        | Kevin Ferguson                                                                                         |
| **Last updated** | 2026-07-09                                                                                             |
| **Related**      | [prd.html](./prd.html) · [ui-design.html](./ui-design.html) · [architecture.html](./architecture.html) |

---

## 0. How to read this

This is the build order for the v2 KPI Tracker: CRUD **KPIs**, CRUD **Views** (grouping KPIs),
and CRUD **access to Views**, on the stack in [architecture.html](./architecture.html).

Work ships in **vertical slices**. Each slice is one reviewable chunk (aim ~100 lines), full-stack
where it makes sense, written **test-first**, and I **stop for code review after each** before
starting the next. Nothing is committed unless you explicitly say so, and that authorization is
single-use (it does not carry to the next slice).

Every slice must leave the tree green: lint, format check, typecheck, and the unit/api/e2e suites
that exist so far, mirroring CI. Coverage floor is 85%; the status engine and authorization
predicates approach 100%.

---

## 1. Decisions

**Locked**

- **Framework: Fastify + TypeScript.** This is a **full server rewrite**. The existing Express
  scaffold (`authenticate.ts`, `express.d.ts`, role model) is replaced, not migrated. Its ideas
  (env validation, error handler, `/healthz`, `/api/me`, first-login auto-provisioning) are ported
  to Fastify equivalents.
- **Auth model: ownership + per-View binary sharing.** No global roles. Drop the `Role` enum; keep
  a single `isAdmin` boolean for break-glass. Access follows ownership and `ViewAccess`.
- **Client: reuse the existing Vite + React + TypeScript shell.** It is not coupled to Express
  (it only calls the API), so it stays. New pages/components are built on top of it.
- **Value model:** periodic manual readings, per-KPI cadence, unit ∈ {number, percent, dollars},
  goal rule = comparator + goal (between takes lower + upper), fixed 10% band. Yes/no is out.

**Open (not blocking; default assumed)**

- **Compute host:** single EC2 (systemd + nginx + cloudflared) assumed, matching the architecture
  doc. Revisit if we prefer ECS/Fargate.
- **Request validation library:** Fastify JSON-schema via `fastify-type-provider-zod` (one schema
  drives validation + inferred TS types). Alternative: TypeBox. Assumed zod.
- **Sparkline stroke:** status-colored (green/yellow/red). Alternative: single muted line.

---

## 2. Current state

Branch `first-build`. The scaffold is committed in git but **the working tree is currently wiped**
(every source file shows as deleted; only `docs/` remains). Step one of Phase 0 is to restore or
re-scaffold.

What exists in history to reference (not reuse verbatim, since the server is being rewritten):
monorepo layout, Prisma + `User` + init migration, an Express `authenticate` middleware with
first-login auto-provisioning, `GET /api/me`, a Vite/React shell showing the signed-in user, and
GitHub Actions CI.

---

## 3. Conventions

- **Server layering: Routes → Controllers → Models.** Routes are Fastify route definitions: HTTP
  plumbing, schema validation, and the auth `preHandler` only. Controllers hold business logic and
  authorization decisions. Models are the thin Prisma data-access layer and the **only** place
  `PrismaClient` is used.
- **Auth as a Fastify plugin.** A global `preHandler` verifies the request and decorates
  `request.user`. Per-route `preHandler` guards enforce ownership / View access. No unguarded
  routes.
- **Validation** with per-route zod schemas (request + response) through the type provider.
- **Status is server-only** (`utils/status.ts`), returned by the API; the client never recomputes.
- **Testing:** Vitest (unit), Fastify **`app.inject()`** (api, against an isolated test DB, run
  serially), Playwright (e2e). Follows the universal testing standard. Centralized third-party
  mocking.
- **No Docker in prod** (CI-only Postgres container for api tests). Secrets from SSM. Terraform in
  `infra/`.

### Target repo layout

```
server/
  prisma/                schema.prisma, migrations/
  src/
    index.ts             buildApp().listen()
    app.ts               buildApp(): register plugins, hooks, routes
    config/env.ts        zod-validated env
    db/client.ts         PrismaClient singleton
    plugins/
      prisma.ts          decorate app.prisma
      auth.ts            verify Cloudflare Access JWT, decorate request.user
    hooks/authz.ts       requireKpiOwner, requireViewOwner, requireViewAccess, requireAdmin
    routes/              me, kpis, readings, views, viewAccess (.routes.ts)
    controllers/         *.controller.ts
    models/              *.model.ts (only PrismaClient consumer)
    schemas/             *.ts (zod request/response)
    utils/               status.ts, authz.ts, httpError.ts
  __tests__/             unit/, api/
client/                  reused Vite/React shell: src/{pages, components, utils}
infra/                   Terraform
docs/
```

---

## 4. Build order (vertical slices)

### Phase 0 — Fastify foundation (server rewrite)

- Restore/clean the tree. Remove Express deps; add `fastify`, `@fastify/*`, the zod type provider,
  `jose`.
- `buildApp()` wiring: env plugin (zod), prisma plugin (decorate `app.prisma`), global
  `setErrorHandler`, `/healthz`.
- Port `authenticate` to a Fastify **auth plugin**: dev path uses `DEV_LOGIN_EMAIL` when
  `NODE_ENV !== production`; decorate `request.user`; keep first-login auto-provisioning.
- Migrate `User`: drop `Role`/`role`, add `isAdmin Boolean @default(false)`; seed admin becomes
  `isAdmin`. Delete `roles.ts`.
- `GET /api/me` returns `{ email, name, isAdmin }`. Update CI to the new scripts.
- **Tests:** unit (env parse, provisioning rule); api via `inject()` (`/healthz`, `/api/me` 200 + 401).
- **Done when:** app boots on Fastify, `/api/me` green, zero Express or role references, CI green.

### Phase 1 — Data model

- Prisma enums `Unit`, `Comparator`, `Cadence`; models `Kpi`, `Reading` (unique `[kpiId, periodKey]`),
  `View`, `ViewKpi` (`@@id([viewId, kpiId])`, `position`), `ViewAccess` (unique `[viewId, userId]`).
  Mirrors the ERD in the architecture doc.
- One migration; regenerate client.
- **Done when:** migration applies clean on a fresh DB and types generate.

### Phase 2 — Status engine (pure)

- `utils/status.ts`: `computeStatus(comparator, goal, goalUpper, value)` with the 10% band and the
  between logic from the doc.
- **Tests:** exhaustive units per comparator, between bounds, band edges (green/yellow/red), no-data.
  Target ~100%.

### Phase 3 — KPIs CRUD

- `models/kpi.model.ts`, `controllers/kpi.controller.ts`, `routes/kpis.routes.ts`, guard
  `requireKpiOwner`.
- `POST /api/kpis`, `GET /api/kpis`, `GET /api/kpis/:id`, `PATCH /api/kpis/:id`,
  `POST /api/kpis/:id/archive` (+ restore), `DELETE /api/kpis/:id` (admin).
- Validation: finite goal; `between` needs `goalUpper > goal`; non-between rejects `goalUpper`.
- **Tests:** api 2xx / 4xx / 401 / 403 / 404 per endpoint; ownership enforced.

### Phase 4 — Readings + sparkline series

- `POST /api/kpis/:id/readings` (upsert by `periodKey`, backdatable), `GET .../readings`.
- List and detail responses embed computed **status** plus a bounded recent series
  (`{ periodKey, value }`, last ~8) behind `?include=sparkline`.
- **Tests:** upsert-same-period updates; backdate never overrides a newer period; series is bounded.

### Phase 5 — Views CRUD

- Model/controller/routes + `requireViewOwner`.
- `POST /api/views`, `GET /api/views?filter=owned|shared`, `GET /api/views/:id`,
  `PATCH /api/views/:id`, `PATCH /api/views/:id/kpis` (membership + order, guarded by
  `canAddKpiToView`), archive/restore, `DELETE` (admin).
- **Tests:** owner-only mutations; a KPI can join multiple views; removing from a view never deletes
  the KPI.

### Phase 6 — View access + cascade

- `hooks/authz.ts` predicates: `canAccessView`, `canManageAccess`, `canAccessKpi` (own OR in an
  accessible view), `canAddKpiToView`.
- `GET/POST/DELETE /api/views/:id/access` (grant by email, revoke), guarded by `canManageAccess`.
- **Tests:** granting a view cascades read to its KPIs; a viewer can read but cannot edit or record;
  revoke removes read access reachable only through that view.

### Phase 7 — Client: KPIs

- API client + shared types; Dashboard grid (status cards **with inline sparklines**); KPI detail +
  trend chart; Create/Edit KPI modal (unit selector, rule dropdown, single goal / between
  lower+upper); Record-value modal. Mirrors [ui-design.html](./ui-design.html).
- **Tests:** component tests for status rendering + form validation hints; MSW-mocked API.

### Phase 8 — Client: Views + sharing

- Views list (my / shared), View detail (roll-up + sparklines), Create/Edit View (KPI picker +
  reorder), Manage-access modal (invite by email, viewer/owner, revoke).

### Phase 9 — Archive + admin

- Archived tab (KPIs + Views), restore; hard-delete surfaced admin-only.

### Phase 10 — E2E (Playwright)

- P0 money path: create KPI → record values → group into a View → share it → assert a second user
  is read-only. Clean up all created data on teardown.

### Phase 11 — Infra & deploy (Terraform)

- Aurora (private subnet, backups), EC2 (AL2023; systemd units for api / nginx / cloudflared), SSM
  secrets, security groups (DB reachable only from the API SG).
- GitHub OIDC + SSM Run Command deploy: pull release, `prisma migrate deploy`, reload the api unit;
  nginx serves the built SPA.
- Cloudflare Access + Google SSO documented as a one-time manual setup.

### Phase 12 — Hardening

- Real origin JWT verification against the Cloudflare Access JWKS (`jose`, checks `iss`/`aud`),
  replacing the dev bypass; fail closed.
- Authorization audit: every route declares a guard; add a test that fails if any route is
  unguarded.
- Coverage check (85% floor), refresh `LOCAL_DEV.md`, final lint/format/typecheck pass.

---

## 5. Sequencing notes

- Phases 0–6 are backend and unblock all UI work; 7–9 are the client; 10–12 harden and ship.
- The status engine (Phase 2) is a dependency for Phases 3–8, so it lands early and stays pure.
- Infra (Phase 11) can begin in parallel once the data model (Phase 1) is stable, since it does not
  depend on feature code.

---

## 6. Out of scope for v1

Alerts/notifications, stale-value flags, a View editor tier, configurable tolerance, automated data
ingestion, per-reading annotations. See the PRD "Future considerations".
