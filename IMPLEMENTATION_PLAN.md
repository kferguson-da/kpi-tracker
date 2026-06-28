# KPI Tracker — Implementation Plan

A simple internal app for tracking company KPIs. Each KPI has a **goal rule** (a comparator
and goal value); its dated readings drive a **green / yellow / red** status and a **trend over
time**. Authentication happens at the Cloudflare edge via Google SSO; the app runs on a single
EC2 instance with a local Postgres database.

- **URL:** `kpis.dealershipaccelerator.io`
- **Audience:** internal (Dealership Accelerator staff)
- **Goal:** the smallest thing that lets us set goals, record dated values, and see status + trend at a glance.

---

## 1. Architecture overview

```
Browser
  │  (Google SSO at the edge)
  ▼
Cloudflare Access  ──►  Cloudflare WAF / TLS
  │  injects Cf-Access-Jwt-Assertion header
  ▼  (Cloudflare Tunnel — no public inbound ports)
cloudflared (on EC2)
  ▼
nginx (localhost reverse proxy)
  ├── /            → static React build (client/dist)
  └── /api/*       → kpi-server (Express, localhost:3000)
                        ▼
                    Postgres (local on instance, bound to 127.0.0.1) via Prisma
```

One EC2 instance. No public inbound ports — Cloudflare reaches the origin through an outbound
Tunnel only. Services managed by `systemd`. No Docker in production (CI uses a Postgres
container only).

---

## 2. Stack

| Layer         | Choice                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Language      | Node 24+ + TypeScript (strict), both server and client                 |
| API           | Express 5 + TypeScript                                                 |
| ORM           | **Prisma** (Postgres). Type-safe client; no raw SQL outside migrations |
| Frontend      | React 18+ + Vite + TypeScript                                          |
| Charts        | Inline SVG trend chart (no chart dependency)                           |
| Auth verify   | `jose` (verify Cloudflare Access JWT) in Express middleware            |
| DB            | Postgres 16, local on the instance                                     |
| Reverse proxy | nginx                                                                  |
| Edge          | Cloudflare Access (Google SSO) + Cloudflare Tunnel                     |
| Tests         | Vitest (unit), Vitest + Supertest (API), Playwright (E2E)              |
| CI/CD         | GitHub Actions                                                         |
| IaC           | Terraform                                                              |

> Status logic is **server-only** — computed in `server/utils/` and returned by the API. The
> client renders what it receives; it keeps a small goal-rule validator in `client/src/utils/`
> only for inline form feedback. There is no shared package.

---

## 3. Repository structure

**Monorepo with sibling `server/` and `client/`.** Each has its own `package.json`,
`node_modules`, and lint config. The root `package.json` only orchestrates (via
`concurrently`); it is not an npm workspace root.

```
kpi-tracker/
  package.json            # root: concurrently scripts (dev/test/lint across both)
  server/
    package.json
    .eslintrc / eslint config
    prisma/
      schema.prisma       # models + relations (single source of truth)
      migrations/         # generated SQL migrations (raw SQL allowed here)
    src/
      index.ts            # entrypoint: load env, init Prisma, listen
      app.ts              # build Express app: mount middleware + routers
      config/
        env.ts            # env loading + validation
      db/
        client.ts         # PrismaClient singleton (import everywhere from here)
      routes/             # HTTP plumbing only (express.Router per domain)
        kpis.routes.ts
        users.routes.ts
        me.routes.ts
      controllers/        # business logic
        kpis.controller.ts
        users.controller.ts
        me.controller.ts
      models/             # data-access layer — Prisma Client queries only (no raw SQL)
        user.model.ts     # one module per domain; controllers call these
        kpi.model.ts
        kpiReading.model.ts
      middlewares/
        authenticate.ts   # verify CF Access JWT (or dev-login); attach req.user
        requireRole.ts
        requireOwnedKpi.ts
        errorHandler.ts
      utils/              # the server utility boundary (status, validation, http)
        status.ts         # green/yellow/red from a goal rule (+ validateGoalRule)
        httpError.ts
      __tests__/
        unit/<name>.unit.tests.ts
        api/<name>.api.tests.ts
        mocks/            # centralized third-party mocks + test DB helpers
  client/
    package.json
    eslint config
    index.html
    vite.config.ts
    src/
      main.tsx
      App.tsx
      pages/<Domain>/PageName.tsx        # pages grouped by domain
      components/                         # FLAT — no nested component folders
        ComponentName.tsx
        ComponentName.css                 # co-located
        ComponentName.test.tsx            # co-located
      utils/              # the client utility boundary (api client, goalRule validator)
      test/
        mocks/            # centralized browser/XHR mocks (e.g. MSW handlers)
    tests/
      e2e-tests/<domain>/<name>.spec.ts   # Playwright
  infra/                  # Terraform
  docs/                   # LOCAL_DEV.md, PRODUCTION_SETUP.md
```

### Layering & boundaries (enforced by convention + lint)

- **Routes → Controllers → Models.** Routes do only HTTP plumbing (path, method, attach
  middleware, call a controller). Controllers own business logic. The **Models** layer is a
  thin Prisma data-access layer (`models/*.model.ts`) exposing typed query functions.
- **No raw SQL** outside `server/prisma/migrations/`; everywhere else uses the Prisma Client.
- **Controllers never import the Prisma client directly** — only `models/*` do. Model
  **relations** are declared once in `prisma/schema.prisma` (Prisma's single source of truth,
  in place of an associations file).
- **`utils/` is the only place for shared helpers** on each side. Controllers and pages import
  from `utils/`; they do not import each other. Pages don't reach into other pages; components
  stay flat and reusable.
- **Every route is gated by auth middleware** (see §5).

---

## 4. Authentication & authorization

### 4.1 Edge authentication (Cloudflare Access + Google SSO)

- Cloudflare Access protects the hostname with **Google Workspace** as the IdP and injects a
  signed JWT in `Cf-Access-Jwt-Assertion` on every origin request.
- `middlewares/authenticate.ts` **re-verifies the JWT on every request** — never trusts the
  header blindly: fetch + cache the team JWKS, verify signature, check `iss` + `aud`, extract
  the email, **fail closed** (`401`). Config: `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`.
- Stateless — no app session/cookie. Revoking in Cloudflare/Google is immediate.
- **Local dev:** `DEV_LOGIN_EMAIL` stands in for the header, honored only when
  `NODE_ENV !== 'production'`.

### 4.2 Authorization — middleware-gated, owner-based

Roles in the `users` table: `viewer` (default) < `editor` < `admin`.

- `authenticate` is applied app-wide (every `/api/*` route); `/healthz` is the only public route.
- Per-route guards compose on top:
  - `requireRole('editor' | 'admin')` — role floor.
  - `requireOwnedKpi('active' | 'archived')` — loads the `:id` KPI (via the model layer), enforces
    owner-or-admin and the expected archived state (`404` / `403` / `409`).
- Owner rule: `editor` may write only KPIs where `created_by = req.user.email`; `admin` any.
- First login auto-provisions a `viewer` (admin if email = `SEED_ADMIN_EMAIL`).
- **Every route declares its guard explicitly** — no unguarded `/api` route. The SPA hides
  controls the user lacks, but the server is the source of truth.

---

## 5. Data model (Prisma)

Defined in `server/prisma/schema.prisma` — models **and** relations in one file:

```
User         id, email @unique, role, createdAt
Kpi          id, name, description?, unit?, comparator, goal, goalUpper?,
             createdBy, archivedAt?, archivedBy?, createdAt, updatedAt, readings KpiReading[]
KpiReading   id, kpiId → Kpi (onDelete: Cascade), value, recordedBy, recordedAt
```

- Relation `Kpi 1—* KpiReading` (cascade delete) lives in the schema. Status is derived, not stored.
- **Current value** = the `KpiReading` with the latest `recordedAt` (backdating an older value
  does not override a newer one).
- **Archiving** is a reversible soft-delete (`archivedAt`); archived KPIs are hidden from the
  dashboard and read-only until restored. Hard delete is admin-only.
- **Migrations:** `prisma migrate` (generated SQL in `server/prisma/migrations/`) owns the
  schema; raw SQL only there. `comparator` limited to the six values (Prisma enum or a CHECK);
  a CHECK ties `goalUpper` to `between`.

---

## 6. Status computation (server-only, well-tested)

`server/src/utils/status.ts`:

```ts
type Comparator = '>=' | '>' | '=' | '<' | '<=' | 'between';
type GoalRule = { comparator: Comparator; goal: number; goalUpper: number | null };

function statusFor(value: number | null, rule: GoalRule): 'red' | 'yellow' | 'green' | 'unknown';
function validateGoalRule(rule: GoalRule): { ok: true } | { ok: false; errors: string[] };
```

Rules (tolerance = **10%**, fixed for all KPIs):

- **green:** goal met for the comparator (`between` = `goal ≤ value ≤ goalUpper`).
- **yellow:** missed, but within 10% of the missed bound (`|miss| ≤ 0.1 × |bound|`).
- **red:** missed by more than 10%. **unknown:** no reading yet (`value === null`).
- Validation: finite goal; `between` requires `goalUpper > goal`; non-`between` rejects an upper value.

The KPI controller calls `statusFor` when shaping responses, so the client never computes
status. `validateGoalRule` is the authoritative check on create/edit; the client keeps a thin
copy in `client/src/utils/` purely for inline form hints.

---

## 7. API surface (Express, `/api`, every route auth-gated)

| Method | Path                     | Guards                                      | Controller action                         |
| ------ | ------------------------ | ------------------------------------------- | ----------------------------------------- |
| GET    | `/api/me`                | `authenticate`                              | current `{ email, role }`                 |
| GET    | `/api/kpis`              | `authenticate`                              | list active (`?archived=true` → archived) |
| GET    | `/api/kpis/:id`          | `authenticate`                              | detail + reading history                  |
| POST   | `/api/kpis`              | `authenticate, requireRole('editor')`       | create (validated rule)                   |
| PATCH  | `/api/kpis/:id`          | `authenticate, requireOwnedKpi('active')`   | edit fields/rule                          |
| POST   | `/api/kpis/:id/readings` | `authenticate, requireOwnedKpi('active')`   | record dated value                        |
| POST   | `/api/kpis/:id/archive`  | `authenticate, requireOwnedKpi('active')`   | soft-delete                               |
| POST   | `/api/kpis/:id/restore`  | `authenticate, requireOwnedKpi('archived')` | restore                                   |
| DELETE | `/api/kpis/:id`          | `authenticate, requireRole('admin')`        | permanent delete                          |
| GET    | `/api/users`             | `authenticate, requireRole('admin')`        | list users + roles                        |
| PATCH  | `/api/users/:id`         | `authenticate, requireRole('admin')`        | change role                               |

Standard error envelope `{ error: { code, message } }` via `errorHandler`. Controllers
validate request bodies (using `utils/`), then call models.

---

## 8. Client (React + Vite, pages by domain)

- **`pages/Dashboard/DashboardPage.tsx`** — nav (DAOS lockup + user/role chip), status summary
  strip, grid of KPI cards. Card: name, current value, goal rule, status badge (color + icon +
  label, never color alone). Read-only for viewers.
- **`pages/Kpi/KpiDetailPage.tsx`** — inline-SVG **trend over time** (goal reference line),
  current/goal stats, dated **record-value** form, **Edit** — gated to owner/admin.
- **`pages/Kpi/KpiEditorPage.tsx`** (or a modal component) — name/description/unit, comparator
  dropdown + goal (+ upper for `between`); inline validation via `client/src/utils`.
- **`pages/Archived/ArchivedPage.tsx`** — archived list with Restore / admin Delete.
- **`pages/Admin/UsersPage.tsx`** — role management (admin only).
- Flat, reusable **components/** (e.g. `StatusBadge`, `KpiCard`, `TrendChart`, `Modal`), each
  with co-located `.css` and `.test.tsx`.
- `client/src/utils/api.ts` is the single API client; pages/components call it, not each other.

### Branding — DAOS Design System (source of truth)

`/Users/kevin/Documents/docs/DAOS Design System/`: jet-black `#0c0c0e`, Sea Salt `#f0f0f2`,
DA Lime `#c1ff72` (emphasis only), Electric Purple rare, **Inter** only, 8pt grid, line-drawn
icons. R/Y/G → semantic tokens `--success`/`--warning`/`--error`.

---

## 9. Testing

| Suite       | Tool                     | Location                                         |
| ----------- | ------------------------ | ------------------------------------------------ |
| Server unit | Vitest                   | `server/__tests__/unit/<name>.unit.tests.ts`     |
| Server API  | Vitest + Supertest       | `server/__tests__/api/<name>.api.tests.ts`       |
| Client unit | Vitest + Testing Library | co-located `ComponentName.test.tsx`              |
| E2E         | Playwright               | `client/tests/e2e-tests/<domain>/<name>.spec.ts` |

- **Centralized third-party mocking:** server mocks/test-DB helpers in
  `server/__tests__/mocks/`; client browser/XHR mocks in `client/src/test/mocks/` (e.g. MSW);
  E2E installs browser-side third-party mocks from one place. No ad-hoc per-test mocks of the
  same dependency.
- API tests run against an isolated test database (reset per test), serially. Per endpoint:
  2xx, 4xx validation, 401, 403, 404 (and 409 for archived). Validate full response bodies.
- Follow `universal-testing.md` (naming, isolation, 85% floor).

---

## 10. Hosting & deployment (single EC2, systemd, no Docker)

- AL2023 (t3.small); Postgres local, bound to `127.0.0.1`.
- systemd units: `postgresql`, `kpi-server` (Express on `127.0.0.1:3000`), `nginx` (serves
  `client/dist` + proxies `/api`), `cloudflared` (Tunnel).
- Config/secrets in SSM Parameter Store; migrations run before restart; nightly `pg_dump` → S3.

---

## 11. Security baseline

- Origin reachable only via Tunnel; no public inbound ports; Postgres on localhost.
- JWT verified every request, fail closed; ACL enforced server-side in middleware on every route.
- Prisma parameterizes queries; validate input at the boundary; never log secrets/JWTs.
- Least-privilege IAM (SSM read, S3 backup write).

---

## 12. CI/CD — GitHub Actions

- **`ci.yml`** (PR + push to `main`; Node 24): install (server + client) → lint → typecheck → server
  unit → client unit → build → server API tests (Postgres `services:` container) → E2E.
- **`deploy.yml`** (tag `v*`): build → migrate → ship to EC2 → reload, via GitHub **OIDC → AWS**
  (no static keys) + **SSM Run Command** (no inbound SSH).

---

## 13. Infrastructure as Code — Terraform (`infra/`)

Locked-down SG (egress only), EC2 + EBS, least-privilege IAM instance profile, S3 backup +
artifact buckets, SSM params, GitHub OIDC deploy role, `user_data` bootstrap (Postgres, Node,
nginx, cloudflared + systemd units). Remote state in S3 + DynamoDB lock. Cloudflare Access app

- Google IdP + Tunnel are documented manual steps.

---

## 14. Documentation deliverables

- `docs/LOCAL_DEV.md`, `docs/PRODUCTION_SETUP.md`, `infra/README.md`, root `README.md`.

---

## 15. Build order (vertical slices, ~reviewable chunks)

1. **Skeleton + auth + CI:** root `concurrently` scripts; `server` (Express, Prisma client +
   `User` model in `schema.prisma`, `config`, `authenticate` middleware + dev-login,
   auto-provision, `me` route); `client` (Vite shell showing the logged-in user); `ci.yml`;
   `LOCAL_DEV.md`.
2. **KPI read path:** `Kpi` + `KpiReading` in `schema.prisma` + migration + model modules;
   `status.ts` (+ unit tests); `GET /api/kpis`; Dashboard with status cards.
3. **Write path:** create/edit KPI + goal rule (validated), record dated readings; `requireRole`
   - `requireOwnedKpi`; editor UI.
4. **Detail + trend:** `GET /api/kpis/:id`; KPI detail page with inline-SVG trend + record form.
5. **Archive:** archive/restore/delete endpoints + archived view.
6. **Admin + E2E:** user role management; Playwright P0 journeys in CI.
7. **Infra + deploy:** Terraform, `deploy.yml`, Cloudflare Access + Tunnel, backups, `PRODUCTION_SETUP.md`.

---

## 16. Out of scope for v1

- Stale-value warnings, KPI categories/grouping, status-change alerts, configurable tolerance.
