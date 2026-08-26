<div align="center">

# CareRoute

**Scheduling and visit management for home &amp; community care agencies**

Coordinators schedule caregiver visits against real operational constraints. Caregivers check in, complete care-plan tasks, and check out from the field.

[![Backend](https://img.shields.io/badge/backend-Spring%20Boot%204.1-6DB33F?logo=springboot&logoColor=white)](#tech-stack)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](#tech-stack)
[![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)](#tech-stack)
[![Deployment target](https://img.shields.io/badge/deploy%20target-Azure%20Canada%20Central-0078D4?logo=microsoftazure&logoColor=white)](#deployment)

[Product requirements](docs/PRD.md) · [Implementation plan](docs/PLAN.md) · [Design brief](docs/DESIGN-BRIEF.md)

</div>

---

> **Not deployed yet.** Everything below runs locally today, including the full
> `docker-compose.prod.yml` stack. The Azure environment and the GitHub Actions pipeline are
> [Phase 7](docs/PLAN.md#phase-7--azure-deployment-and-cicd) and are not in the repository yet, so
> [Deployment](#deployment) describes the target rather than a running system. Add the live URL
> here when it exists.

## Screenshots

Captured from the running application against the seeded dataset.

### Assigning a caregiver

The signature interaction. Every caregiver the server evaluated is listed — the ineligible ones stay at full contrast with the reason beside them, because the reason is usually the thing a coordinator can change. Clicking a blocked caregiver attempts the assignment anyway, and the refusal that comes back is the server's, not the browser's.

![Assigning a caregiver: a blocked caregiver is tried, refused with CAREGIVER_MISSING_SKILL, then an eligible one is assigned and the board updates](docs/screenshots/assign-flow.gif)

| Coordinator dashboard | Schedule board |
|---|---|
| ![Dashboard with four KPI tiles, a visits-per-day chart and the unassigned worklist](docs/screenshots/dashboard.jpg) | ![Day view of the schedule grouped by caregiver, with the time-aligned unassigned rail above it](docs/screenshots/schedule-board.jpg) |

| Assign dialog | Caregiver day view |
|---|---|
| ![Assign dialog listing one eligible caregiver and four blocked ones, each with a category tag and a stated reason](docs/screenshots/assign-caregiver.jpg) | ![Caregiver day view with a large check-in target as the primary action](docs/screenshots/caregiver-day.png) |

---

## The problem

Home care agencies coordinate a workforce that never sets foot in a central office. Scheduling a single visit means satisfying three constraints at once: the caregiver is not already booked, they actually work that day and hour, and they hold the qualification the visit requires. Handled in spreadsheets, this produces double-bookings, unqualified assignments, and no reliable record that a visit happened at all.

CareRoute enforces those constraints in the API rather than the UI, and it explains its refusals. When a coordinator opens the assign dialog, ineligible caregivers are not hidden — they are shown with the reason:

```
Sarah Whitfield      Booked 10:00–11:30
Marcus Delaney       Not available Tuesdays
Priya Raman          Missing qualification: NURSING
Tom Alcott           Eligible
```

## Features

**For coordinators**
- Client records with editable care plans and full visit history
- Caregiver profiles with skills and recurring weekly availability
- Schedule board grouped by caregiver, with date navigation and status filters
- Constraint-aware assignment that surfaces the reason for every exclusion
- Dashboard: visits today, unassigned, in progress, completion rate

**For caregivers**
- Mobile-first day view of their own visits, and only their own
- Check in and check out within an enforced time window
- Per-task completion tracking against the client's care plan
- Visit notes

## Business rules

The functional core. Every rule is enforced server-side and covered by both a passing and a rejecting test.

| Rule | Enforcement | On violation |
|---|---|---|
| No overlapping visits for one caregiver | Indexed query on the half-open interval `[start, end)` | `409 Conflict` |
| Visit must fall inside the caregiver's availability | Weekly availability window check | `422 Unprocessable Entity` |
| Caregiver must hold the required skill | Skill set membership | `422 Unprocessable Entity` |
| Check-in only from SCHEDULED, within ±30 min of start | Entity state machine + time tolerance | `409 Conflict` |
| Check-out only from IN_PROGRESS | Entity state machine | `409 Conflict` |
| A completed visit cannot be cancelled | Entity state machine | `409 Conflict` |
| Caregivers may only touch their own visits | Service-layer ownership guard | `403 Forbidden` |
| Concurrent edits are rejected, not silently merged | JPA optimistic locking (`@Version`) | `409 Conflict` |

Two design decisions worth calling out:

- **The state machine lives on the `Visit` entity**, as `canTransitionTo(VisitStatus)`, rather than being scattered as conditionals across services. Illegal transitions are impossible to express, not merely unlikely.
- **One eligibility component, two consumers.** The predicate that rejects an invalid assignment is the same one that powers the eligibility endpoint. The rules cannot drift apart because there is only one copy of them.

## Tech stack

**Backend** — Java 21 · Spring Boot 4.1 · Spring Security (JWT in an httpOnly cookie) · Spring Data JPA with Specifications · PostgreSQL 16 · Flyway · Actuator · JUnit 5 + Testcontainers · Maven

**Frontend** — React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand · React Router · React Hook Form + Zod · Motion · Lucide · Axios · Vitest + Testing Library + MSW

**Infrastructure** — Docker · Docker Compose · nginx · *planned:* GitHub Actions · Azure Container Apps · Azure Database for PostgreSQL · Azure Static Web Apps

## Architecture

```mermaid
flowchart LR
    B["Browser<br/>React 19 + Vite"]

    subgraph API["Spring Boot 4.1"]
        F["JwtAuthenticationFilter"]
        C["Controllers<br/>DTO records, validation"]
        S["Services<br/>eligibility · scheduling · execution"]
        R["Repositories<br/>JPA + Specifications"]
    end

    DB[("PostgreSQL 16<br/>Flyway-managed")]

    B -->|"HTTPS · httpOnly cookie"| F
    F --> C --> S --> R --> DB
```

Requests carry the JWT in an httpOnly cookie, with an `Authorization: Bearer` fallback for API testing. Authorization is layered: route matchers in the security config, `@PreAuthorize` role checks on the controllers, and an ownership guard (`VisitAccessGuard`) in the service layer for the "own visits only" rule that role annotations cannot express.

## Getting started

### Prerequisites

Java 21 · Node 20+ · Docker Desktop

### Run it

```bash
git clone <repository-url> careroute
cd careroute
cp .env.example .env          # then edit: set a JWT secret of 32+ characters
```

**1. Database**

```bash
docker compose up -d
```

**2. Backend** — starts on `http://localhost:8080`

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The `dev` profile seeds 8 clients, 5 caregivers and 41 visits across the current week, including unassigned ones so the assign flow has something to act on. Seeding is idempotent — restarting will not duplicate data.

**3. Frontend** — starts on `http://localhost:5173`

```bash
cd frontend
npm install
npm run dev
```

### Demo accounts

Seeded by the `dev` profile.

| Role | Username | Password |
|---|---|---|
| Coordinator | `dana.coordinator` | `Password123!` |
| Caregiver | `marcus.leblanc` | `Password123!` |
| Admin | `priya.admin` | `Password123!` |

### Full stack in Docker

Both surfaces from images, with the frontend served by nginx:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Frontend on `http://localhost:5173`, backend on `http://localhost:8080`. This is the closest local rehearsal of the deployed topology — a browser talking to two different origins — which is what makes the externalised cookie and CORS policy worth having.

Two things to know about it. `VITE_API_URL` is a **build argument**, not a runtime variable: Vite inlines it into the bundle, so an image built for one environment cannot be re-pointed at another by setting an environment variable on the running container. And the stack runs under its own compose project name (`careroute-prod`), so it can be brought up alongside the development database rather than fighting it for a container name.

## Configuration

All configuration is environment-driven; no secrets are committed. The backend reads the repository-root `.env` at startup, so `cp .env.example .env` is a required setup step — nothing is hardcoded as a fallback. Real environment variables take precedence over the file, which is how the deployed environments override it.

| Variable | Purpose | Local default |
|---|---|---|
| `DATABASE_DB` / `DATABASE_USER` / `DATABASE_PASSWORD` | Postgres credentials | see `.env.example` |
| `DATABASE_PORT` | Host port for Postgres | `5432` |
| `JWT_SECRET_KEY` | HMAC-SHA256 signing key, **32+ characters** | dev placeholder |
| `JWT_EXPIRATION_TIME` | Token lifetime in ms | `86400000` |
| `JWT_COOKIE_SECURE` | `Secure` flag on the auth cookie | `false` |
| `JWT_COOKIE_SAME_SITE` | `Lax` locally, `None` in production | `Lax` |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `VISIT_CHECK_IN_TOLERANCE_MINUTES` | BR-4 check-in window either side of the scheduled start | `30` |
| `APP_TIME_ZONE` | Zone the scheduled times are interpreted in | `America/Toronto` |
| `BACKEND_PORT` / `FRONTEND_PORT` | Published ports, `docker-compose.prod.yml` only | `8080` / `5173` |
| `VITE_API_URL` | API origin baked into the frontend bundle at build time | `http://localhost:8080/api/v1` |

> In production the frontend and backend sit on different domains, making every API call cross-site. The auth cookie must be issued `SameSite=None; Secure` or the browser will silently drop it — producing a login that appears to succeed followed by 401s on everything after. Hence the two configurable cookie flags.

## API

Base path `/api/v1`. Errors follow RFC 7807 (`application/problem+json`).

| Method | Endpoint | Role |
|---|---|---|
| `POST` | `/auth/register`, `/auth/login` | public |
| `POST` | `/auth/logout` | authenticated |
| `GET` | `/auth/me` | authenticated |
| `GET` `POST` | `/clients` | coordinator |
| `GET` `PUT` `DELETE` | `/clients/{id}` | coordinator |
| `GET` `POST` | `/clients/{id}/care-plan-tasks` | coordinator |
| `DELETE` | `/clients/{id}/care-plan-tasks/{taskId}` | coordinator |
| `GET` `POST` | `/caregivers` | coordinator |
| `GET` `PUT` | `/caregivers/{id}`, `/caregivers/{id}/availability` | coordinator |
| `GET` `POST` | `/visits` | coordinator |
| `GET` | `/visits/{id}` | coordinator, owning caregiver |
| `GET` | `/visits/eligible-caregivers` | coordinator |
| `POST` | `/visits/{id}/assign`, `/visits/{id}/cancel` | coordinator |
| `POST` | `/visits/{id}/check-in`, `/check-out` | owning caregiver |
| `POST` | `/visits/{id}/tasks/{taskId}/complete` | owning caregiver |
| `POST` | `/visits/{id}/notes` | owning caregiver |
| `GET` | `/visits/my` | caregiver |
| `GET` | `/dashboard/summary` | coordinator |

"Coordinator" above means `ROLE_COORDINATOR` or `ROLE_ADMIN`. `POST /auth/register` is public but self-service only: it grants `ROLE_CAREGIVER` and rejects a request naming any other role, so the caregiver *profile* still has to be created by a coordinator through `POST /caregivers`.

Full detail in [docs/PRD.md](docs/PRD.md#8-api-surface). With the backend running, the generated OpenAPI document is served at `/v3/api-docs` and Swagger UI at `/swagger-ui.html`.

`/actuator/health` is public and carries the liveness and readiness probe groups, which is what a container platform probes. `/actuator/info` is exposed but, like everything else, requires authentication.

## Testing

```bash
cd backend && ./mvnw test     # JUnit 5 + Testcontainers (Docker must be running)
cd frontend && npm test       # Vitest + Testing Library + MSW
```

Backend tests are weighted toward the business rules rather than coverage percentage: each rule has a passing case and a rejecting case, plus boundary coverage where it matters — a visit ending exactly when the next begins must *not* register as a conflict.

Frontend tests are deliberately few and all about behaviour that would be expensive to get wrong: the assign flow renders every refusal the server sent and surfaces the one it sends back when a blocked caregiver is tried anyway; the route guards redirect without ever mounting the guarded screen; the login schema refuses the round trip; the modal traps focus and hands it back. MSW runs with `onUnhandledRequest: "error"`, which is what lets a test assert that a request did *not* happen — otherwise a guard that silently leaked would still pass.

## Deployment

**Planned, not yet built.** Phase 7 is the remaining work: no `.github/workflows/` and no Azure resources exist in this repository today. The full stack runs locally from `docker-compose.prod.yml`, which is the same two-origin topology the target describes.

Target: **Azure, Canada Central (Toronto)** — the nearest region, and one that keeps a healthcare-adjacent project's data in Canada.

| Component | Service |
|---|---|
| Backend container | Azure Container Apps |
| Database | Azure Database for PostgreSQL Flexible Server |
| Frontend | Azure Static Web Apps |
| Images | GitHub Container Registry |
| CI/CD | GitHub Actions with OIDC federated credentials |

The intended pipeline runs tests on every push and, on `main`, builds and publishes the backend image and deploys both surfaces — authenticating by OIDC federation so no long-lived Azure credential is stored in the repository. Runbook, tier choices and known gotchas in [docs/PLAN.md](docs/PLAN.md#phase-7--azure-deployment-and-cicd).

## Project structure

```
careroute/
├── backend/                  Spring Boot API
│   ├── Dockerfile            multi-stage backend build (Maven → JRE)
│   ├── pom.xml
│   ├── src/main/java/com/careroute/backend/
│   │   ├── config/           security, CORS, JWT + scheduling properties, Clock
│   │   ├── controller/
│   │   ├── dto/              record types
│   │   ├── exception/        ProblemDetail handlers
│   │   ├── model/            entities + Visit state machine
│   │   ├── repository/       JPA repos
│   │   ├── security/         JWT filter, UserDetails
│   │   ├── seed/             dev-profile CommandLineRunner
│   │   ├── service/          eligibility, scheduling, execution, access guard
│   │   └── spec/             JPA Specifications for the list filters
│   ├── src/main/resources/db/migration/   V1–V3 Flyway migrations
│   └── src/test/java/…       Testcontainers integration + unit tests
├── frontend/                 React + Vite SPA
│   ├── Dockerfile            multi-stage build, nginx runtime
│   ├── nginx.conf            SPA fallback, cache headers, /healthz
│   ├── .env.example          VITE_API_URL template
│   ├── package.json
│   └── src/
│       └── api/ components/ context/ features/ hooks/ lib/ stores/ test/ types/
├── docs/
│   ├── PRD.md                requirements, domain model, business rules
│   ├── PLAN.md               phased plan with exit criteria
│   ├── DESIGN-BRIEF.md       Claude Design prompt and art direction
│   └── screenshots/          captures and the demo GIF used above
├── docker-compose.yml        local Postgres
├── docker-compose.prod.yml   full stack, own project name (careroute-prod)
├── .env                      local config (gitignored)
├── .env.example              template
├── .gitignore
└── README.md
```

## Roadmap

- [ ] Caffeine caching on the dashboard aggregate
- [ ] CSV export of visits by date range
- [ ] Server-sent events for live schedule board updates
- [ ] Refresh token rotation
- [ ] Application Insights dashboard

---

<div align="center">

Built by **Eric Mignardi** · Ancaster, Ontario

</div>
