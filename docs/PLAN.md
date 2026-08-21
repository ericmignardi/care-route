# CareRoute — Implementation Plan

**Companion to:** [PRD.md](./PRD.md)
**Target:** 5 working days (~40 focused hours)
**Last updated:** 2026-08-21

---

## How to use this document

Eight phases, each with an **objective**, a **task list**, **deliverables**, and **exit criteria**. Exit criteria are binary and verifiable — a command that passes, a request that returns a specific status, a screen that renders. Do not start a phase until the previous phase's exit criteria are met.

Estimates total **46 hours** against a 40-hour week. That overage is intentional and is absorbed by the descope list in section 8. Assume you will cut something; decide *what* in advance rather than in a panic on Friday afternoon.

### Phase-to-day mapping

| Day | Phases | Theme |
|---|---|---|
| 1 | 0, 1 | De-risk, then build the data layer |
| 2 | 2 | Domain logic and the API |
| 3 | 3, 4 | Tests, then frontend foundation |
| 4 | 5 | Frontend features |
| 5 | 6, 7 | Polish, docs, deploy |

---

## Phase 0 — De-risking and foundation

**Objective:** Eliminate every unknown that could derail a later phase. Nothing here is feature work; all of it is insurance.

**Estimated: 2 hours**

### Tasks

- [x] ~~Add dependencies to `backend/pom.xml`~~ — done. Two coordinate corrections were needed against Spring Boot 4.1: Testcontainers 2.0 renamed its modules, so the artifacts are `testcontainers-postgresql` and `testcontainers-junit-jupiter`, not `postgresql`/`junit-jupiter`. Boot 4 does not manage springdoc, so its version is pinned in a property.
- [x] ~~Run `./mvnw dependency:resolve` and confirm the build compiles~~ — done
- [x] ~~**Boot the app and confirm springdoc actually starts.**~~ — done, and the anticipated failure did not occur. The springdoc 2.x line does target Boot 3.x, but **springdoc 3.1.0 is built against Spring Boot 4.1.0 exactly** and starts cleanly. Swagger UI and `/v3/api-docs` both return 200. Descope item #4 is therefore still available but not forced.
- [x] ~~Rename the base package `com.example.demo` to `com.careroute.backend`~~ — done
- [x] ~~Update `groupId`, `artifactId`, `name`, and `description` in `pom.xml`~~ — done
- [x] ~~Update the JAR glob in `backend/Dockerfile`~~ — done, now `careroute-*.jar`
- [x] ~~Fix the prod compose build context~~ — done, resolved by moving the `Dockerfile` into `backend/` so it matches the declared `context: backend`
- [x] ~~Delete `DataService.java` and the four demo endpoints in `AuthController`~~ — done
- [x] ~~Externalize CORS origins~~ — done via `app.cors.allowed-origins`, bound as a `List<String>` so the property accepts a comma-separated list
- [x] ~~Externalize the cookie `SameSite` attribute~~ — done via `security.jwt.cookie-same-site` on `JwtProperties`
- [x] ~~Permit `/actuator/health` and the springdoc paths in `SecurityConfig`~~ — done; `anyRequest().authenticated()` would otherwise have returned 401 on the health check
- [x] ~~Make the backend read the repository-root `.env`~~ — done via `spring.config.import`. This is what allows `application.properties` to carry no hardcoded origin at all while local development still works from a single `.env`. Real environment variables outrank the imported file, so deployed overrides behave as expected.

### Deliverables

- A compiling backend on the new package name with no placeholder code
- Configuration-driven CORS and cookie policy

### Exit criteria

- [x] `./mvnw clean compile` succeeds
- [x] `grep -r "com.example.demo" backend/src` returns nothing
- [x] `grep -rn "localhost:5173" backend/src` returns nothing
- [x] `curl localhost:8080/actuator/health` returns status `UP` — the body is `{"groups":["liveness","readiness"],"status":"UP"}`. The `groups` key is additive: Boot 4 auto-configures the liveness and readiness probe groups, which Phase 7 wants for the Container Apps health probe, so they were kept rather than suppressed to match the literal string.

Additionally verified beyond the stated criteria, since the cookie and CORS work is the whole reason this phase exists:

- [x] Booted a second time with `JWT_COOKIE_SAME_SITE=None`, `JWT_COOKIE_SECURE=true`, and two Azure-style origins. The login response carried `Secure; HttpOnly; SameSite=None`, both configured origins passed preflight, and `http://localhost:5173` was then correctly rejected with 403 — confirming the property genuinely drives behaviour rather than merely existing.
- [x] `./mvnw test` green

> **Why the cookie work belongs here, not on deployment day.** The JWT cookie is currently `SameSite=Lax`. Once the frontend sits on `*.azurestaticapps.net` and the backend on `*.azurecontainerapps.io`, those are cross-site requests and the browser will silently refuse to send the cookie. You will see a login that appears to succeed followed by 401s on every subsequent call, with nothing useful in the logs. Production needs `SameSite=None; Secure`. Wiring it as configuration now costs fifteen minutes; discovering it on Friday costs an afternoon.

---

## Phase 1 — Data layer and migrations

**Objective:** A migration-managed schema with realistic seed data, so every screen built afterwards has something in it.

**Estimated: 6 hours**

### Tasks

- [ ] Set `spring.jpa.hibernate.ddl-auto=validate` and configure Flyway
- [ ] `V1__baseline.sql` — existing `users`, `roles`, `user_roles`
- [ ] `V2__care_domain.sql` — `clients`, `caregivers`, `availability`, `visits`, `care_plan_tasks`, `visit_tasks`, plus foreign keys
- [ ] `V3__seed_roles.sql` — insert `ROLE_ADMIN`, `ROLE_COORDINATOR`, `ROLE_CAREGIVER`
- [ ] Add a composite index on `visits(caregiver_id, scheduled_start)` — this is what makes the BR-1 overlap check a single fast query
- [ ] Create entities following the conventions already in `User.java`: UUID ids, Lombok accessors, `@PrePersist`/`@PreUpdate` timestamps
- [ ] Add `@Version` to `Visit` for optimistic locking (BR-8)
- [ ] Implement `canTransitionTo(VisitStatus)` on the `Visit` entity — the state machine lives on the entity, not in a service
- [ ] Create repositories; add the overlap query to `VisitRepository`
- [ ] Write a `dev`-profiled `CommandLineRunner` seeding ~8 clients with real Ancaster/Dundas/Hamilton addresses, ~5 caregivers with varied skills and availability, and ~40 visits across the current week in mixed states

### Deliverables

- Six new tables under version control
- Seven entities with relationships mapped
- A one-command reproducible demo dataset

### Exit criteria

- `docker compose down -v && docker compose up -d` followed by app start completes with no Hibernate validation errors
- `flyway_schema_history` shows three successful migrations
- `SELECT count(*) FROM visits;` returns roughly 40
- Restarting the app twice does not duplicate seed data

> **Do not defer seeding to the end.** Every screen in Phases 5 and 6 is built against this data, and the difference between a demo recording with a populated schedule board and one with three test rows is the difference between a project that looks finished and one that looks abandoned.

---

## Phase 2 — Domain logic and API

**Objective:** Every business rule enforced server-side, exposed through a complete REST API.

**Estimated: 8 hours** — the largest phase, and the one that carries the project's technical credibility.

### Tasks

- [ ] DTOs as Java `record` types with static `from(Entity)` factories (skip MapStruct — a second annotation processor alongside Lombok requires explicit `annotationProcessorPaths` ordering in the existing compiler config, for no benefit at this scale)
- [ ] Typed exceptions: `ResourceNotFoundException`, `BusinessRuleViolationException`, `SchedulingConflictException`
- [ ] Migrate `GlobalExceptionHandler` to RFC 7807 `ProblemDetail`, preserving the existing field-error map behaviour from `handleValidationExceptions`; add a handler for `OptimisticLockingFailureException` returning 409
- [ ] **`VisitEligibilityChecker`** — one component evaluating BR-1, BR-2, BR-3 and returning a structured result with a reason per failure
- [ ] `VisitSchedulingService` — schedule, assign, cancel; delegates to the eligibility checker
- [ ] `VisitExecutionService` — check-in (BR-4), check-out (BR-5), task completion
- [ ] Ownership guard for BR-7: compare the authenticated principal against the visit's assigned caregiver
- [ ] `ClientService`, `CaregiverService` with pagination
- [ ] JPA `Specification` composing the optional visit filters (date range, caregiver, client, status)
- [ ] Controllers for clients, care plan tasks, caregivers, availability, visits, dashboard
- [ ] `GET /auth/me`
- [ ] Cap page size at 100 (NFR-4)

### Deliverables

- All 8 business rules enforced
- All endpoints in PRD section 8 implemented
- Consistent `application/problem+json` errors

### Exit criteria

Verified by request, with a coordinator session:

| Request | Expected |
|---|---|
| Schedule a valid visit | `201` |
| Schedule an overlapping visit, same caregiver | `409` |
| Assign a caregiver lacking the required skill | `422` |
| Schedule outside the caregiver's availability | `422` |
| Check out a SCHEDULED visit | `409` |
| Cancel a COMPLETED visit | `409` |
| `GET /visits/eligible-caregivers` | `200`, each ineligible entry carries a reason |
| As caregiver A, `GET` caregiver B's visit | `403` |

Additionally: `GET /visits?page=0&size=20` returns a page envelope, and the SQL log shows no N+1 pattern (NFR-6).

> **The eligibility checker is the centrepiece.** Write it once and call it from both the assignment path and the eligibility endpoint. If you find yourself writing the overlap logic a second time, stop and refactor — a reviewer who spots duplicated business rules will discount everything else. It is also the thing to talk about in an interview, so it is worth the extra thirty minutes to get clean.

---

## Phase 3 — Automated testing

**Objective:** Prove the business rules hold, with tests that would actually catch a regression.

**Estimated: 5 hours**

### Tasks

- [ ] Testcontainers Postgres base class shared across integration tests
- [ ] For **each** of BR-1 through BR-6: one passing test and one rejecting test
- [ ] Boundary test for BR-1: a visit ending exactly when another begins must **not** conflict (half-open interval)
- [ ] Unit tests for `canTransitionTo` covering every legal and illegal transition
- [ ] MockMvc security tests: unauthenticated returns 401; wrong role returns 403; caregiver accessing another's visit returns 403
- [ ] One optimistic-locking test: concurrent updates to the same visit, second one returns 409

### Deliverables

- Roughly 20–25 tests, weighted toward business rules rather than getters

### Exit criteria

- `./mvnw test` is green from a clean state
- Every row in the PRD business-rule table maps to at least one named test
- Deliberately breaking the overlap query causes a test to fail (verify this once — a test that cannot fail is not a test)

> Skip line-coverage targets. Chasing a percentage produces tests for DTO constructors. Twenty tests that encode the domain rules are worth more to a reviewer than eighty that assert Lombok works.

---

## Phase 4 — Frontend foundation

**Objective:** An authenticated shell with routing, state, and API access working end to end.

**Estimated: 5 hours**

### Tasks

- [ ] Install `react-router`, `zustand`, `motion`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `date-fns`
- [ ] Axios instance with `withCredentials: true` and a 401 interceptor that clears auth state and redirects to login
- [ ] Zustand auth store, hydrated from `GET /auth/me` on load
- [ ] `ThemeContext` via Context API for dark mode
- [ ] Router with `ProtectedRoute` and `RoleRoute` wrappers
- [ ] App shell: responsive sidebar, top bar, user menu, role-aware navigation
- [ ] Base UI components: Button, Input, Select, Modal, Table, Badge, Skeleton, EmptyState, Toast
- [ ] Zod schemas for auth forms; derive TypeScript types with `z.infer` so schemas are the single source of truth
- [ ] Login and Register wired to the real backend

### Directory structure

```
src/
  api/          axios client, endpoint modules
  components/   ui/, layout/
  features/     auth/ clients/ caregivers/ visits/ dashboard/
  hooks/        useClients, useVisits, useDebounce
  stores/       authStore (Zustand)
  context/      ThemeContext
  lib/          dates, cn(), constants
  types/        z.infer'd types
  routes.tsx
```

### Exit criteria

- Logging in through the UI lands on the dashboard with the user's name shown
- A hard refresh preserves the session
- Visiting a coordinator route as a caregiver redirects rather than rendering
- Logout clears state and blocks back-navigation into protected routes
- `npm run build` produces no TypeScript errors

---

## Phase 5 — Frontend features

**Objective:** The complete coordinator and caregiver workflows, usable end to end.

**Estimated: 10 hours** — the largest frontend phase. Build in the listed order; the schedule board is the demo centrepiece and must not be the thing that gets rushed.

### Tasks

- [ ] **Clients** — paginated searchable table, create/edit modal, detail view with care plan editor and visit history
- [ ] **Caregivers** — list, detail with skills editor, weekly availability editor (7 rows of day/start/end)
- [ ] **Schedule board** — day view grouped by caregiver, date navigation, status filters. Week view only if time permits.
- [ ] **Assign flow** — the product's signature interaction. On opening, call `eligible-caregivers`; render eligible caregivers as selectable and ineligible ones dimmed **with their reason shown inline** ("Booked 10:00–11:30", "Not available Tuesdays", "Missing: NURSING"). Do not hide ineligible caregivers — showing why is the entire point.
- [ ] **Visit detail** — status timeline, task checklist, notes, coordinator actions
- [ ] **My Visits** (caregiver) — mobile-first day list, large check-in/check-out targets, task checkboxes with optimistic UI and rollback on error
- [ ] Surface `ProblemDetail` messages in toasts rather than generic failure text
- [ ] Loading, empty, and error states on every async view (NFR-11)

### Exit criteria

The full loop, performed entirely in the browser with no API client:

1. Log in as coordinator, create a client, add two care plan tasks
2. Schedule a visit; observe at least one caregiver excluded with a stated reason
3. Assign an eligible caregiver
4. Log in as that caregiver on a 375px viewport
5. Check in, complete both tasks, add a note, check out
6. Return to the coordinator dashboard and observe the KPI change

Also: attempting a conflicting assignment shows a readable error, not a stack trace.

---

## Phase 6 — Dashboard, polish, and documentation

**Objective:** Turn a working application into a presentable one.

**Estimated: 5 hours**

### Tasks

- [ ] Dashboard KPI tiles from `/dashboard/summary`
- [ ] Visits-per-day chart for the current week (Recharts, or Tailwind bars — the chart is not worth an extra dependency if time is short)
- [ ] Unassigned upcoming visits list, each linking to its assign flow
- [ ] Motion: page transitions, list enter/exit, KPI count-ups. Restraint here reads as more professional than abundance.
- [ ] Accessibility sweep: keyboard traversal, visible focus rings, labelled inputs, AA contrast, modal focus trapping
- [ ] Frontend tests with Vitest + React Testing Library + MSW — about 8, covering the assign flow, route guards, and one form validation path
- [ ] README with screenshots and a demo GIF
- [ ] Verify `docker compose -f docker-compose.prod.yml up --build` works; add an nginx-served frontend stage

### Exit criteria

- Dashboard numbers match the database
- Every interactive element is keyboard reachable with a visible focus state
- `npm test` passes
- The README renders correctly on GitHub with images loading
- The full prod compose stack serves both surfaces from a clean checkout

---

## Phase 7 — Azure deployment and CI/CD

**Objective:** A public HTTPS URL a recruiter can click, deployed by pipeline rather than by hand.

**Estimated: 5 hours**

Azure is the right choice for this market: Ontario healthcare and public sector are overwhelmingly Microsoft shops, so Azure experience on a healthcare-adjacent project is a genuine signal. Deploy to **Canada Central** (Toronto) — the nearest region to Ancaster, and the one that keeps a healthcare-domain project's data in Canada, which is worth being able to say out loud in an interview.

### Target architecture

| Component | Service | Tier |
|---|---|---|
| Backend container | Azure Container Apps | Consumption (free monthly grant) |
| Database | Azure Database for PostgreSQL Flexible Server | Free tier, B1ms, 12 months |
| Frontend | Azure Static Web Apps | Free |
| Image registry | GitHub Container Registry (ghcr.io) | Free |
| Secrets | Container Apps secrets | Included |

> **On the registry:** Azure Container Registry has no free tier — Basic runs roughly $5 USD/month. GitHub Container Registry is free and Container Apps pulls from it without difficulty. Use ghcr.io unless you specifically want ACR on your resume.

### Tasks

- [ ] Create the Azure account and confirm free-tier eligibility for PostgreSQL Flexible Server (eligibility is subscription-dependent — verify before designing around it)
- [ ] Provision a resource group in Canada Central
- [ ] Provision PostgreSQL Flexible Server; enable "Allow public access from Azure services"; append `?sslmode=require` to the JDBC URL
- [ ] Provision the Container Apps environment and app; external ingress on port 8080
- [ ] Configure the health probe against `/actuator/health`
- [ ] Store `JWT_SECRET_KEY` and the database password as Container Apps secrets — never in the image, never in the repo
- [ ] Set production configuration: `SameSite=None`, `cookie-secure=true`, CORS origin set to the Static Web Apps URL
- [ ] Deploy the frontend to Static Web Apps with `VITE_API_URL` pointing at the Container App
- [ ] GitHub Actions: build and test on push; on `main`, build the image, push to ghcr.io, and deploy both surfaces
- [ ] Authenticate the workflow to Azure with **OIDC federated credentials** rather than a long-lived service principal secret

### Known gotchas

1. **Static Web Apps "linked backend" requires the Standard tier.** On Free, call the Container App URL directly from the browser. This makes requests cross-site, which is exactly why Phase 0 externalized the cookie policy.
2. **Cold starts.** Container Apps scaling to zero means a 20–40 second first request while the JVM boots — fatal if a recruiter clicks your link once and leaves. Set minimum replicas to 1 while you are actively job hunting and accept the small cost, or warm it with a scheduled ping.
3. **Postgres requires SSL.** Without `sslmode=require` the connection fails with an unhelpful error.
4. **Flyway runs on startup against production.** Verify migrations against a scratch database first; a failed migration takes the container down.
5. **Free-tier terms change.** Confirm current tiers at signup rather than trusting this table.

### Exit criteria

- The public URL loads over HTTPS and login works
- The full Phase 5 loop succeeds against production
- Browser devtools confirm the JWT cookie is sent on cross-site requests
- A push to `main` deploys automatically
- No secret appears anywhere in git history
- `/actuator/health` reports UP through the public ingress

---

## 8. Descope order

When time runs short, cut in this order. Decided in advance, deliberately.

| # | Cut | Rationale |
|---|---|---|
| 1 | Week view on the schedule board | Day view demonstrates the same capability |
| 2 | Dashboard chart | KPI tiles carry the information |
| 3 | Frontend test suite | Backend tests are the ones reviewers examine |
| 4 | springdoc / Swagger UI | A README endpoint table substitutes |
| 5 | Admin user-management screens | Seeded accounts cover the demo |
| 6 | Motion polish | Reduce to page transitions only |

**Never cut:** business rule enforcement, the business rule tests, the seed data, the README, or the deployment. Those five are what the project is being judged on.

---

## 9. Stretch, in value order

Only if Phase 7 finishes early:

1. Caffeine cache on the dashboard aggregate
2. CSV export of visits for a date range
3. Server-sent events for live schedule board updates
4. Refresh token rotation
5. Application Insights with a custom dashboard

---

## 10. Daily checklist

Each day, before stopping:

- [ ] Everything committed and pushed with a meaningful message
- [ ] Backend tests green
- [ ] The app starts from a clean `docker compose down -v && up`
- [ ] Current phase exit criteria met, or the gap written down
- [ ] Tomorrow's first task identified
