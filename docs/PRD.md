# CareRoute — Product Requirements Document

**Status:** v1.1 — sections 4, 8, 10 and 11 reconciled against the implementation
**Author:** Eric Mignardi
**Last updated:** 2026-08-26

---

## 1. Overview

CareRoute is a scheduling and visit-management system for home and community care agencies. Coordinators schedule caregiver visits to clients' homes against real operational constraints — caregiver qualifications, weekly availability, and existing bookings — and caregivers check in and out of their assigned visits and complete care-plan tasks from the field.

### 1.1 Problem

Home care agencies coordinate a workforce that never sets foot in a central office. A coordinator scheduling a visit must simultaneously satisfy several constraints:

- the caregiver is not already booked at that time
- the caregiver actually works that day, in that window
- the caregiver holds the qualification the visit requires

Done in spreadsheets, this produces double-bookings, unqualified assignments, and no reliable record of whether a visit actually happened. The cost of a missed visit in this sector is not an inconvenience — it is a vulnerable person who did not receive care.

### 1.2 Solution

A web application with two primary surfaces:

- **Coordinator surface** — a schedule board that only offers caregivers who can legally and practically take a slot, and explains why the others cannot.
- **Caregiver surface** — a mobile-first day view for checking in, completing care-plan tasks, and checking out.

### 1.3 Why this domain

The Hamilton–Ancaster area has an unusually dense cluster of home and community care employers: Ontario Health atHome, St. Joseph's Home Care, ParaMed, and Bayshore HealthCare. The domain carries genuine business rules — enough to demonstrate real modelling ability — without requiring distributed-systems infrastructure to be interesting.

---

## 2. Goals and non-goals

### 2.1 Goals

| # | Goal |
|---|---|
| G1 | Prevent invalid schedules at the API layer, not merely in the UI |
| G2 | Give coordinators a single screen that answers "who can take this visit, and why not the others?" |
| G3 | Produce a verifiable record that a visit occurred: who, when, and which tasks were completed |
| G4 | Enforce that caregivers can access only their own visits |
| G5 | Ship a deployed, publicly reachable application within five working days |

### 2.2 Non-goals

Deliberately excluded to protect the delivery window. These are not oversights.

- Payroll, invoicing, or billing
- Route optimization, mapping, or travel-time calculation
- Real-time push updates between users
- Native mobile applications (the caregiver view is a responsive web page)
- Multi-tenancy — the system models a single agency
- Clinical documentation beyond free-text visit notes
- Regulatory compliance certification (PHIPA, PIPEDA). This is a portfolio project using synthetic data only; it borrows the *shape* of access control from that world without claiming compliance.

---

## 3. Users

| Persona | Role | Context | Primary need |
|---|---|---|---|
| **Dana** | Coordinator | Desk-based, manages ~40 visits/day across ~15 caregivers | Fill every visit with a qualified, available caregiver quickly |
| **Marcus** | Caregiver | In the field, on a phone, between client homes | See today's visits; check in/out; record completed tasks |
| **Priya** | Administrator | Agency operations | Manage caregiver accounts and oversee all data |

The client (care recipient) is a subject of the system, not a user. There is no client-facing login.

---

## 4. Roles and permissions

| Capability | ADMIN | COORDINATOR | CAREGIVER |
|---|:---:|:---:|:---:|
| Manage clients and care plans | Yes | Yes | No |
| View all caregivers | Yes | Yes | No |
| Manage caregiver availability | Yes | Yes | No |
| Create / assign / cancel visits | Yes | Yes | No |
| View all visits | Yes | Yes | No |
| View own visits | Yes | Yes | Yes |
| Check in / check out | No | No | own only |
| Complete visit tasks | No | No | own only |
| Manage user accounts | Yes | No | No |
| Coordinator dashboard | Yes | Yes | No |

**Note on "own only":** this is an ownership constraint, not a role constraint. Role annotations cannot express it, so it requires a service-layer authorization check comparing the authenticated principal against the visit's assigned caregiver. This distinction is a deliberate part of the design.

**Note on availability:** editing it is a coordinator function only (FR-3.3). A caregiver can see their own schedule but cannot change the windows they are bookable in, which matches how agencies actually operate — availability is agreed, not self-declared.

**Note on "view own visits":** admins and coordinators satisfy that row through "view all visits". `GET /visits/my` resolves the caller's caregiver *profile*, so it answers only for accounts that have one.

---

## 5. Domain model

### 5.1 Glossary

| Term | Definition |
|---|---|
| **Client** | A person receiving care at home |
| **Caregiver** | An employee who performs visits; linked one-to-one with a user account |
| **Visit** | A scheduled appointment between one caregiver and one client at a point in time |
| **Availability** | A caregiver's recurring weekly working window (e.g. Tuesdays 09:00–17:00) |
| **Skill** | A qualification a caregiver holds and a visit may require |
| **Care plan task** | A recurring task defined on a client, templating what each visit involves |
| **Visit task** | A snapshot of a care plan task, copied onto a visit and individually completable |

### 5.2 Entities

```
User ──1:1── Caregiver ──1:N── Availability
                 │
                 │ 0:N (nullable until assigned)
                 ▼
Client ──1:N── Visit ──1:N── VisitTask
   │
   └──1:N── CarePlanTask
```

**Skill** (enum): PERSONAL_SUPPORT, NURSING, MEDICATION, MOBILITY, RESPITE
**VisitStatus** (enum): SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, MISSED
**ClientStatus** / **CaregiverStatus** (enums): ACTIVE, INACTIVE

### 5.3 Visit lifecycle

```
              ┌──────────────┐
              │  SCHEDULED   │──── cancel ────▶ CANCELLED
              └──────┬───────┘
                     │ check in
                     ▼
              ┌──────────────┐
              │ IN_PROGRESS  │
              └──────┬───────┘
                     │ check out
                     ▼
              ┌──────────────┐
              │  COMPLETED   │   (terminal)
              └──────────────┘

  SCHEDULED ── scheduled end passes without check-in ──▶ MISSED
```

COMPLETED, CANCELLED, and MISSED are terminal. Transition legality is a property of the `Visit` entity, not of the service that calls it.

---

## 6. Business rules

These are the functional core of the product. Each is enforced server-side and each has a corresponding rejection test.

| ID | Rule | Violation response |
|---|---|---|
| **BR-1** | A caregiver may not have two overlapping non-cancelled visits. Overlap is evaluated on the half-open interval `[start, end)`, so a visit ending at 10:00 and one starting at 10:00 do not conflict. | `409 Conflict` |
| **BR-2** | A visit's time window must fall entirely within one of the assigned caregiver's availability windows for that day of week. | `422 Unprocessable Entity` |
| **BR-3** | The assigned caregiver's skills must contain the visit's required skill. | `422 Unprocessable Entity` |
| **BR-4** | Check-in is permitted only on a SCHEDULED visit, within a configurable tolerance of the scheduled start (default ±30 minutes). | `409 Conflict` |
| **BR-5** | Check-out is permitted only from IN_PROGRESS, and transitions the visit to COMPLETED. | `409 Conflict` |
| **BR-6** | A COMPLETED visit may not be cancelled. | `409 Conflict` |
| **BR-7** | A caregiver may read or act on a visit only if they are its assigned caregiver. | `403 Forbidden` |
| **BR-8** | Concurrent modification of the same visit is detected via optimistic locking and rejected rather than silently overwritten. | `409 Conflict` |

**BR-1, BR-2, and BR-3 in combination define eligibility.** The same predicate that rejects an invalid assignment also powers the eligibility endpoint (FR-3.4) — one implementation, two consumers. Reusing that logic rather than duplicating it is a requirement, not an implementation detail.

---

## 7. Functional requirements

### 7.1 Authentication and accounts

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | A user can register and log in; the JWT is issued in an httpOnly cookie | Must (built) |
| FR-1.2 | A user can log out, clearing the cookie | Must (built) |
| FR-1.3 | The current user's identity and roles are retrievable via `GET /api/v1/auth/me` | Must |
| FR-1.4 | An admin or coordinator can create a caregiver account linked to a caregiver profile, in one call | Should |

### 7.2 Clients

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Coordinators can create, view, edit, and deactivate clients | Must |
| FR-2.2 | The client list is paginated, sortable, and searchable by name | Must |
| FR-2.3 | A client detail view shows the care plan and full visit history | Must |
| FR-2.4 | Coordinators can add and remove care plan tasks on a client | Must |

### 7.3 Caregivers

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Coordinators can create, view, edit, and deactivate caregivers | Must |
| FR-3.2 | A caregiver has an assignable set of skills | Must |
| FR-3.3 | A caregiver's weekly availability is editable as day/start/end windows | Must |
| FR-3.4 | `GET /api/v1/visits/eligible-caregivers` returns, for a proposed time window and required skill, every caregiver with an eligible/ineligible flag and a **reason** when ineligible | Must |

### 7.4 Visits

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Coordinators can schedule a visit for a client, optionally unassigned | Must |
| FR-4.2 | Coordinators can assign or reassign a caregiver, subject to BR-1/2/3 | Must |
| FR-4.3 | Coordinators can cancel a visit, subject to BR-6 | Must |
| FR-4.4 | The visit list supports filtering by date range, caregiver, client, and status, with pagination | Must |
| FR-4.5 | A schedule board shows a day or week grouped by caregiver | Must |
| FR-4.6 | Creating a visit copies the client's care plan tasks into visit tasks | Must |
| FR-4.7 | A visit detail view shows status, timeline, tasks, and notes | Must |

FR-4.5 shipped as the day view only; the week view was descoped in advance (PLAN section 8, cut #1). FR-4.7 is served by two screens rather than one — a role-gated coordinator read at `/visits/{id}` and the caregiver's own field surface — because a coordinator may read a visit's checklist but may not tick it.

### 7.5 Field operations (caregiver)

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | A caregiver sees only their own visits, defaulting to today | Must |
| FR-5.2 | A caregiver can check in, subject to BR-4 | Must |
| FR-5.3 | A caregiver can mark individual visit tasks complete | Must |
| FR-5.4 | A caregiver can add a visit note | Must |
| FR-5.5 | A caregiver can check out, subject to BR-5 | Must |
| FR-5.6 | The caregiver surface is usable one-handed on a 375px-wide screen | Must |

### 7.6 Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | KPI tiles: visits today, unassigned, in progress, completion rate | Must |
| FR-6.2 | A visits-per-day chart for the current week | Should |
| FR-6.3 | An actionable list of unassigned upcoming visits | Must |

---

## 8. API surface

Base path `/api/v1`. All responses are JSON. Errors use RFC 7807 `application/problem+json`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create account |
| POST | `/auth/login` | public | Authenticate, set cookie |
| POST | `/auth/logout` | any | Clear cookie |
| GET | `/auth/me` | any | Current identity and roles |
| GET | `/clients` | COORD | Paginated, searchable list |
| POST | `/clients` | COORD | Create |
| GET/PUT/DELETE | `/clients/{id}` | COORD | Read / update / deactivate |
| GET/POST | `/clients/{id}/care-plan-tasks` | COORD | List / add |
| DELETE | `/clients/{id}/care-plan-tasks/{taskId}` | COORD | Remove |
| GET/POST | `/caregivers` | COORD | List / create |
| GET/PUT | `/caregivers/{id}` | COORD | Read / update |
| GET/PUT | `/caregivers/{id}/availability` | COORD | Read / replace weekly windows |
| GET | `/visits` | COORD | Filtered, paginated list |
| POST | `/visits` | COORD | Schedule |
| GET | `/visits/{id}` | COORD, owning CAREGIVER | Detail |
| GET | `/visits/eligible-caregivers` | COORD | Eligibility + reasons |
| POST | `/visits/{id}/assign` | COORD | Assign caregiver |
| POST | `/visits/{id}/cancel` | COORD | Cancel |
| POST | `/visits/{id}/check-in` | owning CAREGIVER | BR-4 |
| POST | `/visits/{id}/check-out` | owning CAREGIVER | BR-5 |
| POST | `/visits/{id}/tasks/{taskId}/complete` | owning CAREGIVER | Complete task |
| POST | `/visits/{id}/notes` | owning CAREGIVER | Add a visit note (FR-5.4) |
| GET | `/visits/my` | CAREGIVER | Own visits |
| GET | `/dashboard/summary` | COORD | KPI aggregate |

`COORD` above is satisfied by `ROLE_COORDINATOR` or `ROLE_ADMIN`. `/auth/register` is public but self-service only: it grants `ROLE_CAREGIVER` and refuses a request naming any other role with `422 ROLE_NOT_SELF_ASSIGNABLE`, so no unauthenticated caller can mint a privileged account. Coordinator and admin accounts come from the seed; caregiver profiles come from `POST /caregivers`.

---

## 9. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Security | Passwords BCrypt-hashed; JWT in httpOnly cookie; no secrets in the repository |
| NFR-2 | Security | Every endpoint denies by default; access is granted explicitly |
| NFR-3 | Data | Schema managed by versioned migrations; `ddl-auto` set to `validate` |
| NFR-4 | Performance | List endpoints paginated, default page size 20, hard cap 100 |
| NFR-5 | Performance | The BR-1 overlap check is a single indexed query, never in-memory filtering |
| NFR-6 | Correctness | No N+1 queries on list endpoints — verified by inspecting SQL logs |
| NFR-7 | Reliability | Every business rule has both a passing and a rejecting integration test |
| NFR-8 | Observability | `/actuator/health` and `/actuator/info` exposed; health used as the container probe |
| NFR-9 | Accessibility | Keyboard navigable; visible focus states; WCAG AA contrast; labelled form controls |
| NFR-10 | Responsive | Usable from 375px to 1920px |
| NFR-11 | UX | Every asynchronous view has explicit loading, empty, and error states |
| NFR-12 | Portability | `docker compose up` yields a working full stack from a clean checkout |

---

## 10. Known constraints discovered during design

Verified against the codebase during design, and all six settled in Phase 0. Each carries its outcome below rather than being deleted, since the reasoning is the part worth keeping.

1. **Cross-site cookie.** The JWT cookie was issued `SameSite=Lax` in `AuthController`. Once the frontend and backend sit on different Azure domains the browser will not send it; production requires `SameSite=None; Secure`, which in turn requires HTTPS on both. **Resolved:** both flags are environment-driven (`JWT_COOKIE_SAME_SITE`, `JWT_COOKIE_SECURE`) on `JwtProperties`, and the behaviour was verified by booting with `SameSite=None`, not merely by reading the property back.
2. **Hardcoded CORS origin.** `CorsConfig` allowed only `http://localhost:5173`. **Resolved:** the origin list is `app.cors.allowed-origins`, bound as a `List<String>` so `APP_CORS_ALLOWED_ORIGINS` accepts a comma-separated value. Nothing is hardcoded as a fallback; the backend imports the repository-root `.env` at startup so local development still works from one file.
3. **Prod compose build context.** `docker-compose.prod.yml` set `build.context: backend`, but the `Dockerfile` sat at the repository root and copied `backend/pom.xml`. **Resolved:** the `Dockerfile` now lives in `backend/`, matching the context the compose file already declared, and its `COPY` paths are relative to `backend/`.
4. **`PATCH` not in the CORS allow-list.** Either add it, or model all state transitions as `POST` actions. **Resolved as designed:** every transition in section 8 is a `POST` action, so `PATCH` is never issued.
5. **springdoc under Spring Boot 4.** The springdoc 2.x line targets Boot 3.x, so runtime compatibility was unverified. **Resolved:** springdoc 3.1.0 is built against Boot 4.1.0 and starts cleanly — Swagger UI and `/v3/api-docs` both return 200. The version is pinned in a `pom.xml` property because Boot 4 does not manage it. The descope fallback (a README endpoint table) remains available but was not needed.
6. **Placeholder scaffolding.** `DataService` and four demo endpoints on `AuthController` existed to prove out method security. **Resolved:** removed in Phase 0.

One further hazard was found later, during implementation rather than design, and is recorded here because it is the same class of problem: `POST /auth/register` created whatever role the request body named, inventing it if absent — an unauthenticated path to `ROLE_ADMIN` that would have made every role gate decorative. Registration now grants `ROLE_CAREGIVER` only.

---

## 11. Success criteria

The project is complete when all of the following hold. Status as of 2026-08-26, with Phase 7 outstanding:

- [x] All "Must" functional requirements are implemented — with one stated deviation: FR-4.5 shipped as the day view, the week view descoped
- [x] All eight business rules are enforced server-side and covered by passing and rejecting tests
- [x] A coordinator can schedule a visit and a caregiver can complete it, entirely through the UI
- [x] `docker compose up` produces a working stack from a clean checkout — verified on a fresh volume for both `docker-compose.yml` and `docker-compose.prod.yml`
- [ ] The application is reachable at a public HTTPS URL — Phase 7
- [ ] CI runs backend and frontend tests on every push — Phase 7
- [x] The README contains screenshots and a demo recording

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope expands beyond five days | High | Phase 6 is buffer; descope order is fixed in PLAN.md section 8 |
| Spring Boot 4 ecosystem gaps | Medium | Verify each dependency in Phase 0; springdoc has a documented fallback |
| Cross-site cookie breaks on deploy | High | Make cookie and CORS settings environment-driven in Phase 0, not deployment day |
| Azure free-tier limits or tier changes | Medium | Verify tiers at signup; local Docker stack remains the primary demo path |
| Schedule board UI is more work than estimated | Medium | Ship the day view first; the week view is a stretch |
