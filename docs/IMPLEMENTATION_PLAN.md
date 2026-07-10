# KPI Tracker — Implementation Plan

|                  |                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Status**       | Draft v2                                                                                               |
| **Owner**        | Kevin Ferguson                                                                                         |
| **Last updated** | 2026-07-10                                                                                             |
| **Related**      | [prd.html](./prd.html) · [ui-design.html](./ui-design.html) · [architecture.html](./architecture.html) |

---

## 0. How to read this

This is the build order for the v2 KPI Tracker: CRUD **KPIs**, CRUD **Views** (grouping KPIs),
and CRUD **access to Views**, on the stack in [architecture.html](./architecture.html).

Work ships in **vertical slices**, and this is a hard, non-negotiable rule: each slice cuts across
**every layer the feature touches (DB → API → UI) and is exercisable end-to-end in the browser**.
We do NOT build a whole layer first (all the API for many features, then the UI later). The only
acceptable non-vertical steps are one-time shared foundations (app scaffold, test harness, the
data-model migration, the pure status engine), kept minimal and folded into the first slice that
needs them. Each slice is a reviewable chunk (aim ~100 lines), written **test-first**, and I
**stop for code review after each**. Nothing is committed unless you explicitly say so, single-use.

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

## 2. Progress

Branch `first-build`. Built and committed: the **shared foundations** (Fastify app + auth +
`/api/me`; the full data-model migration; the pure status engine) and, ahead of any UI, the
**KPI API** (CRUD + readings) and **View API** (entity CRUD). Building that much server before any
UI was a deviation from the vertical-slice rule in §0; the slices in §4 correct course by finishing
each feature end-to-end (UI + any remaining API + e2e). **No client exists yet**, so the next slice
is the app shell.

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

## 4. Build order — vertical slices

Hard rule (see §0): each slice below is full-stack (API + UI + tests) and demoable in the browser.
Foundations are the only non-vertical work, and they are done.

### Foundations (shared, built)

- **Fastify app + auth + `/api/me`** — `buildApp`, prisma/auth plugins, the preHandler chain
  (`authenticate` + `requireUser`), first-login provisioning, `isAdmin`.
- **Data model + migration** — all tables/enums (Kpi, Reading, View, ViewKpi, ViewAccess).
- **Status engine** — pure `computeStatus`, exhaustively unit-tested.

> Correction: the **KPI API** (CRUD + readings) and **View API** (entity CRUD) were also built
> server-only (commits through 5a) before any UI. That was the layering mistake this plan now fixes.
> The slices below pair those APIs with their UI and add the missing API where noted, each finished
> end-to-end. From here, no server-only feature work.

### Slice 1 — App shell + see your KPIs

- **Client:** Vite/React shell (DAOS styling), top nav + user chip from `GET /api/me`, a typed API
  client, and the **Dashboard** grid listing KPIs with status badge + inline **sparkline** + summary
  counts from `GET /api/kpis`.
- **API:** already built.
- **Tests:** component tests (status/sparkline render, MSW-mocked); **e2e:** sign in → dashboard
  shows seeded KPIs. Restore the client CI job.

### Slice 2 — Create & edit a KPI

- **Client:** New/Edit KPI modal (unit selector; rule dropdown; single goal, or lower + upper for
  between) with the client goal-rule hint, wired to `POST` / `PATCH /api/kpis`.
- **API:** already built.
- **e2e:** create a KPI → it appears on the dashboard as `no_data`.

### Slice 3 — Record values & the trend

- **Client:** KPI **detail** page (inline-SVG trend chart with the goal reference line + reading
  history) and the **Record-value** modal (period + value), wired to the readings endpoints.
- **API:** already built.
- **e2e:** record values across periods → status + trend update; backdating an older period does not
  change the current value.

### Slice 4 — Group KPIs into Views

- **API (build in this slice):** `PATCH /api/views/:id/kpis` (set membership + order, guarded by
  `canAddKpiToView`); enrich `GET /api/views/:id` to return the grouped KPIs (status + sparkline) and
  a roll-up count.
- **Client:** Views list (My / Shared), View **detail** (grouped cards + roll-up), Create/Edit View
  (KPI picker + drag-reorder).
- **e2e:** create a View, add KPIs, reorder, see grouped statuses; removing a KPI from a View does
  not delete it.

### Slice 5 — Share a View

- **API (build in this slice):** `GET/POST/DELETE /api/views/:id/access` (grant by email / revoke,
  `canManageAccess`); widen `canAccessView` and the `canAccessKpi` cascade so a viewer sees the
  View's KPIs read-only.
- **Client:** Manage-access modal (invite by email, Viewer/Owner, revoke); "Shared with me"
  populated; read-only UI for viewers (no edit / record / manage controls).
- **e2e:** owner shares → a second user reads the View and its KPIs but cannot edit or record; revoke
  removes access.

### Slice 6 — Archive across the app

- **Client:** Archived tab (KPIs + Views) with restore; admin-only hard-delete surfaced.
- **API:** already built (archive / restore / delete).
- **e2e:** archiving hides from the dashboard/views and blocks edits; restore returns it intact.

### Slice 7 — Ship it

- **Infra (Terraform):** Aurora (private subnet, backups), EC2 (AL2023; systemd api / nginx /
  cloudflared), SSM secrets, security groups. GitHub OIDC + SSM Run Command deploy
  (`prisma migrate deploy` → reload). Cloudflare Access + Google SSO documented one-time setup.
- **Hardening:** real origin JWT verification against the Access JWKS (`jose`, `iss`/`aud`, fail
  closed) replacing the dev bypass; an authz-audit test that fails on any unguarded route; 85%
  coverage gate; E2E wired into CI; refresh `LOCAL_DEV.md`.

---

## 5. Sequencing notes

- Foundations are done. Every remaining slice is independently demoable end-to-end; ship them in
  order 1 → 6, then 7 to deploy.
- Slices 1–3 are UI on top of the already-built KPI API. Slices 4–5 build their remaining API inside
  the slice, not before it.
- Infra (Slice 7) can start in parallel since it does not depend on feature code, but nothing ships
  without the hardening in the same slice.

---

## 6. Out of scope for v1

Alerts/notifications, stale-value flags, a View editor tier, configurable tolerance, automated data
ingestion, per-reading annotations. See the PRD "Future considerations".
