# CareRoute — Implementation Plan

**Companion to:** [PRD.md](./PRD.md)
**Target:** 5 working days (~40 focused hours)
**Last updated:** 2026-08-25

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

- [x] ~~Set `spring.jpa.hibernate.ddl-auto=validate` and configure Flyway~~ — done, but **Flyway did not run at all on the first attempt.** Spring Boot 4 split auto-configuration out of `spring-boot-autoconfigure` into per-technology modules, so the bare `flyway-core` dependency added in Phase 0 brought the library without its auto-configuration. The app started, Hibernate validated against an empty schema, and failed with `missing table [availability]` — a misleading error for a missing starter. Fixed by replacing `flyway-core` with `spring-boot-starter-flyway`; `flyway-database-postgresql` is still needed alongside it.
- [x] ~~`V1__baseline.sql` — existing `users`, `roles`, `user_roles`~~ — done
- [x] ~~`V2__care_domain.sql` — `clients`, `caregivers`, `availability`, `visits`, `care_plan_tasks`, `visit_tasks`, plus foreign keys~~ — done, plus a seventh table `caregiver_skills` for the `Set<Skill>` `@ElementCollection`. A join table is the right model here: BR-3 needs to filter caregivers by skill in SQL, which a serialized column could not do.
- [x] ~~`V3__seed_roles.sql` — insert `ROLE_ADMIN`, `ROLE_COORDINATOR`, `ROLE_CAREGIVER`~~ — done, `ON CONFLICT (name) DO NOTHING` so the migration is re-runnable
- [x] ~~Add a composite index on `visits(caregiver_id, scheduled_start)`~~ — done as `idx_visits_caregiver_start`, alongside `idx_visits_client_start` and `idx_visits_start`
- [x] ~~Create entities following the conventions already in `User.java`~~ — done. `@Builder` was added to the new entities (already used elsewhere in the codebase on `CustomUserDetails`), which is what keeps the seeder readable. `Instant` maps cleanly to `TIMESTAMP(6) WITH TIME ZONE` and passes schema validation.
- [x] ~~Add `@Version` to `Visit` for optimistic locking (BR-8)~~ — done
- [x] ~~Implement `canTransitionTo(VisitStatus)` on the `Visit` entity~~ — done, following the PRD section 5.3 state diagram exactly: cancellation is legal only from `SCHEDULED`. BR-6 names only `COMPLETED` as uncancellable, which could be read as permitting `IN_PROGRESS → CANCELLED`; the diagram is the narrower and more explicit statement, so it wins. A visit already under way is ended by checking out, not by cancelling.
- [x] ~~Create repositories; add the overlap query to `VisitRepository`~~ — done. `findOverlapping` evaluates the half-open interval as `scheduledStart < :end AND scheduledEnd > :start`, excludes `CANCELLED`, and takes a nullable `excludedVisitId` so reassigning a visit does not conflict with itself. `findOverlappingForCaregivers` is the batched form the Phase 2 eligibility endpoint needs to avoid N+1.
- [x] ~~Write a `dev`-profiled `CommandLineRunner` seeding ~8 clients, ~5 caregivers, and ~40 visits~~ — done: 8 clients, 5 caregivers, 41 visits, 118 visit tasks, 22 availability windows, 7 user accounts. Every seeded visit satisfies BR-1, BR-2 and BR-3, verified by SQL after seeding — the demo data must not itself violate the rules the product enforces.

### Deliverables

- Seven new tables under version control
- Six new entities with relationships mapped
- A one-command reproducible demo dataset

### Exit criteria

- [x] `docker compose down -v && docker compose up -d` followed by app start completes with no Hibernate validation errors
- [x] `flyway_schema_history` shows three successful migrations
- [x] `SELECT count(*) FROM visits;` returns roughly 40 — returns 41
- [x] Restarting the app twice does not duplicate seed data — counts identical across both restarts; the runner guards on `clientRepository.count() > 0`

Additionally verified:

- [x] All five `VisitStatus` values are present in the seed (25 COMPLETED, 8 SCHEDULED, 4 MISSED, 3 CANCELLED, 1 IN_PROGRESS), spread across the current week, with 5 unassigned upcoming visits so the Phase 6 dashboard and the Phase 5 assign flow both have something to act on
- [x] Zero overlapping visit pairs per caregiver, zero visits outside the assigned caregiver's availability, zero visits requiring a skill the assigned caregiver lacks
- [x] `./mvnw test` green

> **On the test profile.** Tests initially failed with `Failed to determine a suitable driver class`. A `src/test/resources/application.properties` does not merge with the main one — it *shadows* it wholesale, taking the datasource configuration with it. The fix is `application-test.properties` plus `@ActiveProfiles("test")`, which also keeps `DevDataSeeder` from running during tests. Note that a stale `target/test-classes` copy survives a plain `mvnw test`, so `clean` is required after moving the file.

> **Do not defer seeding to the end.** Every screen in Phases 5 and 6 is built against this data, and the difference between a demo recording with a populated schedule board and one with three test rows is the difference between a project that looks finished and one that looks abandoned.

---

## Phase 2 — Domain logic and API

**Objective:** Every business rule enforced server-side, exposed through a complete REST API.

**Estimated: 8 hours** — the largest phase, and the one that carries the project's technical credibility.

### Tasks

- [x] ~~DTOs as Java `record` types with static `from(Entity)` factories~~ — done, 27 records under `dto/`. MapStruct stayed skipped as planned. One addition the plan did not name: `PageResponse<T>`. Returning Spring Data's `Page` directly ties the wire format to a type whose JSON shape is explicitly not contractual, and Boot warns about exactly that; the envelope is now the contract.
- [x] ~~Typed exceptions: `ResourceNotFoundException`, `BusinessRuleViolationException`, `SchedulingConflictException`~~ — done. The latter two carry a `rule` string that reaches the client as a `ProblemDetail` extension property, so a frontend can branch on `CAREGIVER_DOUBLE_BOOKED` versus `CAREGIVER_MISSING_SKILL` without parsing prose. Three exception types cover eight rules because the rule identity travels in the payload rather than in the class name.
- [x] ~~Migrate `GlobalExceptionHandler` to RFC 7807 `ProblemDetail`, preserving the field-error map; add an `OptimisticLockingFailureException` handler returning 409~~ — done, field errors preserved as the `errors` extension property. **Four extra handlers were required that the plan did not anticipate.** The catch-all `@ExceptionHandler(Exception.class)` inherited from the old handler swallows Spring MVC's own exceptions, so an unparseable body, a missing parameter, a wrong method and an unmatched route all returned 500 instead of 400/400/405/404. Explicit handlers for `HttpMessageNotReadableException`, `MissingServletRequestParameterException`, `HttpRequestMethodNotSupportedException` and `NoResourceFoundException` restore the right statuses.
- [x] ~~**`VisitEligibilityChecker`** — one component evaluating BR-1, BR-2, BR-3 and returning a structured result with a reason per failure~~ — done. Written batch-first: `evaluate(Collection<Caregiver>, ...)` is the real implementation and the single-caregiver `check(...)` delegates to it with a singleton list. That inversion is what guarantees the two consumers cannot drift, and it means the eligibility screen costs three queries whether it is evaluating five caregivers or fifty.
- [x] ~~`VisitSchedulingService` — schedule, assign, cancel; delegates to the eligibility checker~~ — done. `POST /visits` copies the client's care plan into visit tasks (FR-4.6): the visit records what was actually asked for, so editing a care plan later cannot rewrite the history of a completed visit.
- [x] ~~`VisitExecutionService` — check-in (BR-4), check-out (BR-5), task completion~~ — done, plus `POST /visits/{id}/notes` for FR-5.4, which the PRD requires but section 8 has no row for.
- [x] ~~Ownership guard for BR-7~~ — done as `VisitAccessGuard`, with two entry points rather than one. `requireViewAccess` lets coordinators read any visit; `requireOwnership` does not, so a coordinator can *see* a visit but cannot check into it. The role table already says so — check in/out is "own only" for caregivers and "No" for both other roles — and collapsing the two into one method would have quietly granted it.
- [x] ~~`ClientService`, `CaregiverService` with pagination~~ — done. `DELETE /clients/{id}` deactivates rather than deletes; a client row is referenced by every visit ever performed for them. `POST /caregivers` creates the login and the profile together (FR-1.4) — neither is useful alone.
- [x] ~~JPA `Specification` composing the optional visit filters~~ — done, plus specifications for clients and caregivers. Each applies its fetch joins only when the query is not the count query, where a fetch join is illegal.
- [x] ~~Controllers for clients, care plan tasks, caregivers, availability, visits, dashboard~~ — done, every row of PRD section 8 implemented.
- [x] ~~`GET /auth/me`~~ — done. It returns `caregiverId`, non-null only for accounts with a profile, which is what Phase 4 needs to decide whether the field surface is reachable at all.
- [x] ~~Cap page size at 100 (NFR-4)~~ — done via `spring.data.web.pageable.max-page-size`; `size=500` returns `"size":100`.

Two items added during the phase that were not on the list:

- [x] **`VisitWindow` value object.** BR-1's half-open interval was about to be re-expressed at each comparison site. Making the window a record with a compact constructor that rejects a non-positive duration puts "half-open" and "must end after it starts" in one place, and gives the checker a parameter type that cannot be malformed.
- [x] **A `Clock` bean and `app.scheduling` properties.** BR-4 compares "now" against a `LocalDateTime` scheduled start, which is only meaningful in a stated timezone, and a hardcoded `Instant.now()` would leave the tolerance test scheduling visits relative to the wall clock and hoping. The tolerance and the zone are both configuration.

### Deliverables

- All 8 business rules enforced
- All endpoints in PRD section 8 implemented
- Consistent `application/problem+json` errors

### Exit criteria

Verified by request against the seeded dataset, with a coordinator session:

| Request | Expected | Actual |
|---|---|---|
| Schedule a valid visit | `201` | `201`, with the client's four care plan tasks copied onto the visit |
| Schedule an overlapping visit, same caregiver | `409` | `409` `CAREGIVER_DOUBLE_BOOKED`, `"Booked 10:00-11:30"` |
| Assign a caregiver lacking the required skill | `422` | `422` `CAREGIVER_MISSING_SKILL`, `"Missing: NURSING"` |
| Schedule outside the caregiver's availability | `422` | `422` `CAREGIVER_UNAVAILABLE`, `"Only available Tuesdays 08:00-16:00"` |
| Check out a SCHEDULED visit | `409` | `409` `ILLEGAL_STATUS_TRANSITION` |
| Cancel a COMPLETED visit | `409` | `409` `ILLEGAL_STATUS_TRANSITION` |
| `GET /visits/eligible-caregivers` | `200`, each ineligible entry carries a reason | `200`; two eligible, three ineligible, one of them carrying two reasons |
| As caregiver A, `GET` caregiver B's visit | `403` | `403` |

- [x] `GET /visits?page=0&size=20` returns a page envelope
- [x] The SQL log shows no N+1 pattern (NFR-6) — see below

Additionally verified beyond the stated criteria:

- [x] **Half-open boundary (BR-1).** A visit 11:30–12:30 abutting one that ends at 11:30 returns `201`, not `409`. This is the one BR-1 case an off-by-one would silently get wrong, so it was worth checking before Phase 3 rather than after.
- [x] **The full field loop.** Check in within tolerance → `200` `IN_PROGRESS` with `checkedInAt`; complete a task → `200`; add a note → `200`; check out → `200` `COMPLETED` with `checkedOutAt`; check out again → `409`.
- [x] **BR-4 rejection.** Checking into a visit weeks away returns `409 CHECK_IN_OUTSIDE_TOLERANCE`, `"Check-in opens within 30 minutes of 10:00"`.
- [x] Unauthenticated `GET /visits` returns `401`; a caregiver hitting `GET /clients` returns `403`. Both come back as `problem+json`.
- [x] Validation failures return `400` with the field-error map intact.
- [x] `./mvnw test` green.

> **The N+1 the plan predicted was there, and it was not where the fetch joins were.** All the obvious associations were already joined, but every list endpoint still fired one `user_roles` query per row: `User.roles` is `EAGER` — deliberately, because authentication reads roles outside any transaction — so each user materialised by a caregiver join fetch triggered its own roles load. Twenty visits meant five extra queries; a hundred would have meant more. `@BatchSize` on `User.roles` collapses them into one, keeping the eager semantics authentication depends on. `Caregiver.skills` and `Caregiver.availability` got the same treatment. Every list endpoint is now a fixed statement count independent of page size: `/visits` and `/caregivers` are five each, `/visits/eligible-caregivers` is three regardless of how many caregivers are evaluated, `/dashboard/summary` is five. This is worth knowing before Phase 6 adds screens on top of them — and it is worth stating in an interview that the fix was found by reading the SQL log rather than by assuming.

> **On reason ordering.** When a caregiver fails several rules at once, something has to decide which one becomes the exception. `EligibilityRule` declaration order does it — inactive, then missing skill, then unavailable, then double-booked — and `EligibilityResult` sorts by it. The consequence is that a 422 wins over a 409 when both apply, which is deterministic and testable rather than dependent on evaluation order. The eligibility endpoint returns *all* the reasons; only the assignment path collapses to one.

> **A privilege escalation was fixed that was not on the task list.** `POST /auth/register` is unauthenticated and was creating any role named in the request body, inventing it if it did not exist. Anyone could have registered as `ROLE_ADMIN` and walked past every role gate added in this phase, which would have made the whole authorization model decorative. Registration now grants `ROLE_CAREGIVER` only and rejects a request naming anything else with `422 ROLE_NOT_SELF_ASSIGNABLE`. Coordinator and admin accounts come from the seed; caregiver accounts come from `POST /caregivers` (FR-1.4).

> **BR-8 is wired but not yet proven.** `OptimisticLockingFailureException` maps to 409 and `VisitDetailResponse` carries `version` so a client can round-trip it, but a concurrent-modification test needs two transactions and belongs to Phase 3, which already has it on the list. This is the one exit-criteria-adjacent item deliberately left for the next phase rather than hand-verified here.

> **The eligibility checker is the centrepiece.** Write it once and call it from both the assignment path and the eligibility endpoint. If you find yourself writing the overlap logic a second time, stop and refactor — a reviewer who spots duplicated business rules will discount everything else. It is also the thing to talk about in an interview, so it is worth the extra thirty minutes to get clean.

---

## Phase 3 — Automated testing

**Objective:** Prove the business rules hold, with tests that would actually catch a regression.

**Estimated: 5 hours**

### Tasks

- [x] ~~Testcontainers Postgres base class shared across integration tests~~ — done as `AbstractIntegrationTest`. The container is a JVM-wide singleton started in a static initialiser rather than a per-class `@Container`, and every subclass declares identical context configuration, so the whole suite starts one database and one Spring context. Testcontainers 2.0 moved the class to `org.testcontainers.postgresql.PostgreSQLContainer`; the legacy `org.testcontainers.containers` coordinate still exists but is not the one to write against.
- [x] ~~For **each** of BR-1 through BR-6: one passing test and one rejecting test~~ — done, with more than one of each where the rule has distinct failure modes. Every test method is prefixed with the rule it covers (`br1_`, `br2_`, …) so the mapping is greppable rather than asserted.
- [x] ~~Boundary test for BR-1: a visit ending exactly when another begins must **not** conflict (half-open interval)~~ — done in both directions (a visit starting when another ends, and ending when another begins), plus a one-minute-overlap test on the other side of the boundary. All three are what caught the deliberate mutation below.
- [x] ~~Unit tests for `canTransitionTo` covering every legal and illegal transition~~ — done as an exhaustive 25-pair matrix. The legal set is transcribed from the PRD state diagram as data rather than re-derived from the switch, so the test is a specification and not a mirror: adding a case to the entity fails it until the diagram here is updated deliberately.
- [x] ~~MockMvc security tests: unauthenticated returns 401; wrong role returns 403; caregiver accessing another's visit returns 403~~ — done, driven through the real filter chain with real JWTs rather than `@WithMockUser`. That was not a stylistic choice: the controllers take `@AuthenticationPrincipal CustomUserDetails`, and a mock principal of a different type arrives as null.
- [x] ~~One optimistic-locking test: concurrent updates to the same visit, second one returns 409~~ — done, split in two. See the note below.

Two items added during the phase that were not on the list:

- [x] **A controllable `Clock`.** `MutableClock` plus a `@Primary` bean in `TestClockConfig` is what makes BR-4's tolerance testable at all: "31 minutes early" becomes a fact the test states rather than a race against the wall clock. The Phase 2 decision to inject a `Clock` instead of calling `Instant.now()` is what made this a ten-line test file.
- [x] **Surefire configuration.** The first full run reported 46 green tests and skipped every integration class in silence — Surefire's default includes stop at `*Test`/`*Tests`, and `*IT` is Failsafe's convention. The suffix is worth keeping as a signal, so Surefire's `<includes>` were widened instead. A build that stays green while running none of the tests that matter is the worst possible failure mode for this phase, and it was one line of configuration away.

### Deliverables

- 74 test methods (104 executions once the transition matrix is parameterised), every one of them about a business rule, an authorization boundary, or a lifecycle transition. Nothing asserts a getter.

### Exit criteria

- [x] `./mvnw test` is green from a clean state — 104 executions, 0 failures, ~35s including container start
- [x] Every row in the PRD business-rule table maps to at least one named test — see the table below
- [x] Deliberately breaking the overlap query causes a test to fail — verified by relaxing `scheduledStart < :end` to `<=` in `findOverlappingForCaregivers`. Exactly three tests failed, all of them the boundary cases, and nothing else moved. The mutation was reverted.

| Rule | Named tests |
|---|---|
| BR-1 | `br1_anOverlappingVisitMakesTheCaregiverIneligible`, `br1_aVisitStartingExactlyWhenAnotherEndsDoesNotConflict`, `br1_aVisitEndingExactlyWhenAnotherBeginsDoesNotConflict`, `br1_oneMinuteOfOverlapStillConflicts`, `br1_aCancelledVisitDoesNotConflict`, `br1_theVisitBeingReassignedDoesNotConflictWithItself`, `br1_schedulingAnOverlappingVisitIsAConflict`, `br1_aVisitAbuttingAnExistingOneIsAccepted`, `br1_anOverlappingVisitIs409WithTheRule` |
| BR-2 | `br2_aWindowInsideTheAvailabilityBlockIsEligible`, `br2_aWindowFillingTheAvailabilityBlockExactlyIsEligible`, `br2_aWindowStartingBeforeAvailabilityOpensIsRejected`, `br2_aWindowEndingAfterAvailabilityClosesIsRejected`, `br2_aCaregiverWhoDoesNotWorkThatDayIsRejected`, `br2_aWindowBridgingTwoAvailabilityBlocksIsRejected`, `br2_schedulingOutsideAvailabilityIsUnprocessable`, `br2_assigningACaregiverWhoDoesNotWorkThatDayIsUnprocessable` |
| BR-3 | `br3_aCaregiverHoldingTheRequiredSkillIsEligible`, `br3_aCaregiverMissingTheRequiredSkillIsRejected`, `br3_assigningACaregiverWithoutTheRequiredSkillIsUnprocessable`, `br3_aCaregiverHoldingTheRequiredSkillCanBeAssigned`, `br3_aCaregiverWithoutTheRequiredSkillIs422WithTheRule` |
| BR-4 | `br4_checkingInOnTimeStartsTheVisit`, `br4_checkingInAtTheEdgeOfToleranceIsAccepted`, `br4_checkingInTooEarlyIsRejected`, `br4_checkingInTooLateIsRejected`, `br4_checkingIntoAVisitAlreadyUnderWayIsRejected`, `br4_checkingIntoACancelledVisitIsRejected` |
| BR-5 | `br5_checkingOutCompletesTheVisit`, `br5_checkingOutOfAScheduledVisitIsRejected`, `br5_checkingOutTwiceIsRejected`, `br5_inProgressLeadsOnlyToCompleted` |
| BR-6 | `br6_aCompletedVisitCannotBeCancelled` (entity and service), `br6_aScheduledVisitCanBeCancelled` (entity and service), `br6_anInProgressVisitCannotBeCancelled`, `br6_cancellingACompletedVisitIs409` |
| BR-7 | `br7_aCaregiverCanReadTheirOwnVisit`, `br7_aCaregiverCannotReadAnotherCaregiversVisit`, `br7_aCaregiverCannotCheckIntoAnotherCaregiversVisit`, `br7_theAssignedCaregiverCanCheckIn`, `br7_aCoordinatorCanReadAnyVisitButCannotCheckIntoIt` |
| BR-8 | `br8_theSecondWriterOfAStaleVisitIsRejected`, `br8_theVersionAdvancesOnEveryWrite`, `br8_anOptimisticLockingFailureIsReportedAs409`, `br8_theHibernateSubclassIsHandledToo` |

Additionally verified:

- [x] The eligibility screen and the assignment path cannot drift: `theBatchPathAndTheSingleCaregiverPathAgree` evaluates the same caregivers both ways and asserts the verdicts are equal. That property is the entire justification for the batch-first design in Phase 2, and it was previously only argued rather than tested.
- [x] Reason ordering is deterministic under multiple simultaneous failures (`everyFailureIsReportedInRuleOrder`), which is what makes the 422-beats-409 collapse in the assignment path predictable.
- [x] The full field loop composes: check in, complete both tasks, add a note, check out, with `checkedInAt` before `checkedOutAt`.
- [x] Validation failures still carry the field-error map over the wire, and both 401 and 403 come back as `application/problem+json` from the filter chain.

> **BR-8 needed two tests, not one, and neither is a thread race.** The realistic failure is not simultaneous writes — it is two coordinators who both opened the visit, one of whom saves second against a copy the first has already superseded. `br8_theSecondWriterOfAStaleVisitIsRejected` reproduces exactly that, deterministically, and asserts the first writer's value survived. Getting to a literal `409` from there needs the second half: the API takes no version in any request body, so no HTTP request can currently carry a stale version, and forcing a genuine race through MockMvc would buy flakiness rather than confidence. `br8_anOptimisticLockingFailureIsReportedAs409` closes the loop by asserting the handler mapping directly. Worth being explicit about, because "one test, returns 409" reads as a single end-to-end assertion and this is honestly not that.

> **The transition matrix is the test worth pointing at in an interview.** Twenty-five assertions generated from a table of legal transitions that was transcribed from the PRD, not extracted from the code. It costs nothing to run and it fails the moment the entity and the specification disagree — which is the only thing a state-machine test can usefully do.

> Skip line-coverage targets. Chasing a percentage produces tests for DTO constructors. Twenty tests that encode the domain rules are worth more to a reviewer than eighty that assert Lombok works.

---

## Phase 4 — Frontend foundation

**Objective:** An authenticated shell with routing, state, and API access working end to end.

**Estimated: 5 hours**

### Tasks

- [x] ~~Install `react-router`, `zustand`, `motion`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `date-fns`~~ — done. `react-router` 8 exports `createBrowserRouter` from the root and a DOM-specific `RouterProvider` from `react-router/dom`; the SPA uses the latter. No coordinate corrections were needed this time.
- [x] ~~Axios instance with `withCredentials: true` and a 401 interceptor that clears auth state and redirects to login~~ — done, with **three paths excluded from the interceptor**. `/auth/login`, `/auth/register` and `/auth/me` return 401 as an *answer*, not as an expired session: bouncing a bad password to `/login` would swallow the server's message, and the hydration probe is expected to 401 for every signed-out visitor. The interceptor also does not navigate — it clears the store and lets `ProtectedRoute` react, which keeps `api/` from importing `stores/` and the two from forming a cycle.
- [x] ~~Zustand auth store, hydrated from `GET /auth/me` on load~~ — done. The status is a three-state `unknown | authenticated | anonymous`, not a boolean. See the note below; the third state is the entire reason a hard refresh works.
- [x] ~~`ThemeContext` via Context API for dark mode~~ — done, driven by `data-theme` on `<html>` to match the design canvas's own selector. The initial value is resolved by an inline script in `index.html` **before first paint**, so a caregiver opening the app at 05:30 never sees a flash of the light palette; `ThemeProvider` reads the same storage key and takes over from there.
- [x] ~~Router with `ProtectedRoute` and `RoleRoute` wrappers~~ — done, plus `PublicOnlyRoute` (keeps a signed-in user off `/login` and `/register`) and `RoleLanding` (`/` is not a screen — it is a question about who is asking, and it answers `/dashboard` or `/my-visits`).
- [x] ~~App shell: responsive sidebar, top bar, user menu, role-aware navigation~~ — done as a **top rail rather than a sidebar**, which is what the design canvas specifies. A coordinator working a 2160px-wide schedule grid should not surrender 240px of it to permanent chrome. Below `lg` the same role-filtered links move into a drawer, so the responsive requirement is met without the desktop cost. A skip link was added, since the navigation now sits above the content.
- [x] ~~Base UI components: Button, Input, Select, Modal, Table, Badge, Skeleton, EmptyState, Toast~~ — done, transcribed from the design's component sheet rather than invented: four button variants across five states, the five status badges, table chrome with an inset focus ring, modal chrome, both toast tones, skeletons and the empty state. Added `Textarea`, `Spinner`, `StatusBadge`, `Field` and `ErrorState` — the last because NFR-11 wants three designed states and the sheet only named two of them as components.
- [x] ~~Zod schemas for auth forms; derive TypeScript types with `z.infer`~~ — done. `registerSchema` uses a cross-field `.refine` for the password confirmation, which is the case a per-field schema cannot express.
- [x] ~~Login and Register wired to the real backend~~ — done and exercised end to end in a browser, not merely compiled. Registration replays the server's field-error map onto the matching form fields and falls back to a banner when the names do not line up.

Three items added during the phase that were not on the list:

- [x] **A toast store, not a toast context.** Toasts are raised from submit handlers and from the API layer, neither of which wants a hook. A Zustand store with an imperative `toast.success/error/info` facade and a single `<Toaster/>` at the root is what lets Phase 5 surface a `ProblemDetail` sentence from anywhere without threading a provider through.
- [x] **`errorMessage` / `errorRule` / `fieldErrors` helpers.** Phase 2 put the rule identity in the payload specifically so a client could branch on `CAREGIVER_DOUBLE_BOOKED` rather than parse prose. These three functions are where that payload gets unpacked, and they exist now so Phase 5's assign flow has one place to read rather than five.
- [x] **Design tokens as a first-class layer.** `index.css` carries the canvas's variable names verbatim (`--pine`, `--mis-fg`, `--ink-2`) and `@theme inline` turns them into Tailwind utilities. Keeping the design's own names means a value can be diffed against the canvas without a translation step, and the light/dark swap is one block rather than a `dark:` variant on every element.

### Directory structure

```
src/
  api/          axios client (interceptors, ProblemDetail helpers), auth endpoints
  components/   ui/, layout/, routing/
  features/     auth/ clients/ caregivers/ visits/ dashboard/
  hooks/        useDebounce
  stores/       authStore, toastStore (Zustand)
  context/      ThemeContext, ThemeProvider
  lib/          cn(), constants, dates, navigation, theme
  types/        api (ProblemDetail, PageResponse), auth (z.infer'd)
  routes.tsx
```

### Exit criteria

Verified in a browser against the seeded dataset and a running backend, not by inspection:

- [x] Logging in through the UI lands on the dashboard with the user's name shown — `dana.coordinator` lands on `/dashboard`, with "Dana Whitcombe" and a `DW` monogram in the top rail
- [x] A hard refresh preserves the session — Ctrl+Shift+R on `/dashboard` returns to `/dashboard`, still signed in
- [x] Visiting a coordinator route as a caregiver redirects rather than rendering — `marcus.leblanc` navigating to `/clients` lands on `/my-visits`; the Clients page never mounts
- [x] Logout clears state and blocks back-navigation into protected routes — signing out from `/clients` lands on `/login`, and Back into `/dashboard` redirects straight out again
- [x] `npm run build` produces no TypeScript errors — and `npm run lint` is clean

Additionally verified:

- [x] **Role-aware navigation.** A coordinator sees Dashboard, Schedule, Clients, Caregivers and My day; a caregiver sees only My day. Hiding a link is a courtesy — every route is guarded independently and the API refuses regardless of what the UI renders.
- [x] **A bad password shows the server's sentence, not a redirect.** "Invalid username or password" renders in the form's error banner and the user stays on `/login`, which is the interceptor exclusion doing its job.
- [x] **Registration works end to end against the real API.** An account was created through the form, granted `ROLE_CAREGIVER` only, and landed on `/my-visits` on first sign-in. The test account was deleted afterwards so the demo dataset is exactly what `DevDataSeeder` produces.
- [x] Zod validation renders per field, including the cross-field password mismatch; the theme toggle swaps the whole palette and persists; no React warnings or errors in the console.
- [x] The demo-account table in `README.md` was wrong — it listed `coordinator` / `caregiver` / `admin` with `password`, none of which exist. Corrected to the seeder's actual `dana.coordinator` / `marcus.leblanc` / `priya.admin` with `Password123!`.

> **The three-state auth status is the whole trick.** A boolean `isAuthenticated` starts `false`, and on a hard refresh the router reads it in the frame before `GET /auth/me` answers — so a signed-in coordinator is bounced to the login screen they were already past. `unknown` makes the guard decline to decide: it renders a loader until the probe resolves. It costs one extra state and it is the difference between a session that survives a refresh and one that merely appears to.

> **Nothing about the session is persisted to the browser.** The JWT is in an httpOnly cookie the frontend cannot read, and the store lives in memory only. That is not only an XSS argument — it is what makes logout actually work. A store rehydrated from `localStorage` would let the back button restore a user object the server has already invalidated, and the UI would render a signed-in shell over an API returning 401 to everything.

> **The design canvas was imported before any screen was built.** `docs/DESIGN-BRIEF.md` said to extract the component sheet into tokens first, and that is what stops five screens from drifting apart. The palette, the type pairing (Newsreader for titles and numerals, Public Sans for UI), the five status treatments, the 38px control height and the single focus ring are all transcribed rather than approximated. Phase 5 builds screens out of these; it does not get to invent new greens.

---

## Phase 5 — Frontend features

**Objective:** The complete coordinator and caregiver workflows, usable end to end.

**Estimated: 10 hours** — the largest frontend phase. Build in the listed order; the schedule board is the demo centrepiece and must not be the thing that gets rushed.

### Tasks

- [x] ~~**Clients** — paginated searchable table, create/edit modal, detail view with care plan editor and visit history~~ — done. The care plan is **add-and-remove rather than edit-in-place**, because the API deliberately has no update endpoint for a task: a visit copies the plan at scheduling time, so silently rewording a task would make two visits claim to have done different things under the same id. Removing and re-adding is the honest operation, and the panel says so.
- [x] ~~**Caregivers** — list, detail with skills editor, weekly availability editor (7 rows of day/start/end)~~ — done, with one deviation. Each of the seven day rows holds **as many windows as the caregiver actually works**, not one. A split shift is a real thing and the seed already contains multi-window days; a strict one-row-per-day editor would have silently deleted the second half of one.
- [x] ~~**Schedule board** — day view grouped by caregiver, date navigation, status filters~~ — done: 240px sticky caregiver column, 160px hour columns, 46px lanes, 36px blocks, the time-aligned unassigned rail, a NOW marker that only renders when the board is showing today, and a legend carrying per-status counts. Week view stayed cut (descope #1). The day lives in the query string, so "the schedule for Thursday" is a link.
- [x] ~~**Assign flow** — the product's signature interaction~~ — done, and it does not re-evaluate a single rule in the browser. `reasons[]` is what the same `VisitEligibilityChecker` that guards the assignment endpoint concluded, so the screen and the server cannot drift. Ineligible caregivers stay at full contrast with a fixed reason column, and clicking one **tries the assignment anyway** — the refusal that comes back is the proof that the UI is a courtesy and the server is the authority.
- [x] ~~**Visit detail** — status timeline, task checklist, notes, coordinator actions~~ — done as **two screens, not one**. `/visits/:id` is the coordinator's read and is role-gated; `/my-visits/:id` is the caregiver's field surface and is not, because "the caregiver this visit is assigned to" is a per-row relationship the server checks (BR-7), not a role the router can decide from. The coordinator's checklist is deliberately inert: `requireViewAccess` lets them read it and `requireOwnership` does not let them tick it, so an actionable checkbox there would be a lie the API refuses.
- [x] ~~**My Visits** (caregiver) — mobile-first day list, large check-in/check-out targets, task checkboxes with optimistic UI and rollback on error~~ — done. The rollback is real: the tick applies instantly, and a failed request puts it back rather than leaving the caregiver believing they recorded something they did not.
- [x] ~~Surface `ProblemDetail` messages in toasts rather than generic failure text~~ — done everywhere, via the Phase 4 `errorMessage`/`errorRule` helpers. BR-4 is the one worth watching: checking in early shows the server's sentence naming the time check-in actually opens.
- [x] ~~Loading, empty, and error states on every async view (NFR-11)~~ — done, including shaped skeletons (a board skeleton with lanes, a table skeleton with rows) rather than one spinner everywhere.

Four items added during the phase that were not on the list:

- [x] **`useAsync`, keyed by string rather than by dependency array.** Every screen loads one or two resources and refetches after its own mutations, so React Query would be machinery the problem does not have. Two things the key buys that a dep array could not: loading becomes *derived* — "the key I want" versus "the key I have" — instead of a second piece of state an effect has to set, and a key cannot be accidentally unstable. The first draft took a dep array and `MyVisitsPage` passed a `Date` into it; `fromDateParam` builds a new instance every render, so it never compared equal to itself and refetched forever. That loop only ever shows up as a hot laptop.
- [x] **`ScheduleVisitModal` creates the visit unassigned, then hands it to the assign flow.** Folding "who takes it" into the create form would mean either hiding the ineligible caregivers or showing eleven refusals inside a create dialog — and the refusals are the part worth reading.
- [x] **Dashboard KPI tiles and the unassigned worklist, pulled forward from Phase 6.** Exit criterion 6 is "observe the KPI change", which is not verifiable against a placeholder. Both come from one response, so it was the tiles or an unverifiable phase. The chart and the count-up motion stayed in Phase 6.
- [x] **Control sizing moved into `controlClasses`.** See the note below; this one was a bug, not a preference.

### Bugs found and fixed

Four, all found by using the thing rather than by reading it.

- [x] **A stale JWT cookie locked the user out of the login screen.** `JwtAuthenticationFilter` caught the JWT *parsing* failures but not `UsernameNotFoundException` — a well-formed, correctly signed, unexpired token naming a user who no longer exists. It escaped the filter and aborted the request before any handler ran, so `POST /auth/login` returned 401 and the only cure was clearing site data by hand. Found by reseeding the database while a browser still held a session, which is exactly what a restore or a redeploy does to every signed-in user. Covered by `StaleSessionIT`.
- [x] **`PUT /caregivers/{id}/availability` failed on any unchanged day.** Clearing the collection and re-adding equal rows in one persistence context puts the inserts ahead of the orphan-removal deletes in Hibernate's action queue, so the new `MONDAY 08:00` row collided with the old one on `uq_availability_slot`. Resubmitting an unchanged week is the *ordinary* case — a coordinator who edits Thursday resubmits Monday to Wednesday untouched — so the editor was broken for almost every real save. Fixed with a `saveAndFlush` between the clear and the adds; covered by `CaregiverAvailabilityIT`.
- [x] **The 500 handler was echoing raw SQL to the browser.** The constraint violation above arrived in the UI complete with the table name, the column list and the offending values. `@ExceptionHandler(Exception.class)` was returning `ex.getMessage()`, which for anything unhandled is whatever the failing layer happened to say. It now returns a fixed sentence and logs the real cause.
- [x] **Every compact control was silently rendering at the form height.** `cn` is a plain join with no tailwind-merge — a deliberate Phase 4 decision, on the stated condition that no caller passes conflicting utilities for the same property. Passing `h-[34px]` alongside the `h-[38px]` that `controlClasses` emits does not override it; it emits both and lets stylesheet order decide. Measured, not guessed: every search box was 38px and the availability time inputs were full-width instead of 116px. Size is now a parameter of `controlClasses` and fixed widths live on a wrapper, which keeps the Phase 4 invariant true rather than quietly false.

### Directory structure added

```
src/
  api/          clients, caregivers, visits, dashboard
  features/
    clients/    ClientsPage, ClientDetailPage, ClientFormModal, clientSchema
    caregivers/ CaregiversPage, CaregiverDetailPage, CaregiverFormModal
    visits/     SchedulePage, ScheduleBoard, ScheduleVisitModal,
                AssignCaregiverModal, VisitDetailPage,
                MyVisitsPage, MyVisitDetailPage, visitSchema
    dashboard/  DashboardPage
  hooks/        useAsync
  lib/          schedule (board geometry), dates (+ day bounds, countdowns)
  types/        domain
```

### Exit criteria

The full loop, performed entirely in a browser against the seeded dataset with no API client:

| # | Step | Result |
|---|---|---|
| 1 | Log in as coordinator, create a client, add two care plan tasks | Nikolai Petrov created, landed on his detail page, two tasks added — stat strip read "2 tasks" |
| 2 | Schedule a visit; observe at least one caregiver excluded with a stated reason | "5 caregivers evaluated. 2 can take this visit." Three excluded across three categories: `QUALIFICATION` "Missing: PERSONAL_SUPPORT", `AVAILABILITY` "Not available Tuesdays", and one caregiver carrying **two** stacked reasons |
| 3 | Assign an eligible caregiver | Marcus LeBlanc assigned; visit history updated to Scheduled |
| 4 | Log in as that caregiver on a narrow viewport | See the note below on 375px |
| 5 | Check in, complete both tasks, add a note, check out | Checked in 13:13, both tasks ticked and struck through, note autosaved ("Saved · visible to your coordinator"), checked out; day list went to "3 of 3 done" |
| 6 | Return to the coordinator dashboard and observe the KPI change | Visits today **7 to 8**, and all three tiles matched a `SELECT` against the database exactly (8 / 5 / 1) |

- [x] **Attempting a conflicting assignment shows a readable error, not a stack trace** — clicking a blocked caregiver returned "Cannot assign this visit / Missing: PERSONAL_SUPPORT / `CAREGIVER_MISSING_SKILL`" in an inline alert.

Additionally verified:

- [x] `npm run build` produces no TypeScript errors, and `npm run lint` is clean.
- [x] `./mvnw clean test` is green — **110 executions**, up from 104, the six new ones covering the two backend bugs above.
- [x] Both mutations reverted deliberately: removing the flush failed 3 of the 4 availability tests (the empty-week case correctly still passed, since nothing is re-inserted), and narrowing the filter's catch failed both stale-session tests.
- [x] Zero console errors or React warnings across every new screen.
- [x] Dark mode holds on the board, the assign modal and the field screens — the palette swap is one block, not a `dark:` variant per element.
- [x] The availability editor round-trips both directions: adding a Saturday window saved, and removing it saved again, leaving the seed exactly as `DevDataSeeder` produces it.

> **On the 375px viewport.** Chrome on Windows clamps a window to 500px wide, so the literal 375px in the criterion could not be exercised — 500px was, which is below the `sm` breakpoint and therefore puts every mobile branch in play, and the caregiver column is `max-w-[560px]` so it is the same rendering path. Worth stating plainly rather than ticking the box: the layout is verified mobile-first, but not at that exact width. A Phase 6 Playwright run with a real device viewport would close it properly.

> **The assign screen is the thing to point at in an interview, and the reason is the column that is not there.** There is no "why not" *computation* in the frontend at all — no skill comparison, no overlap check, no availability arithmetic. The screen renders `reasons[]` and nothing else. That is what makes "the UI and the server cannot disagree" a structural fact rather than a promise, and it is why clicking a blocked caregiver to try anyway is safe to offer: the refusal comes from the same checker that drew the list.

> **Three of the four bugs were only findable by running the app against a database that had changed underneath it.** Reseeding mid-session produced the stale-cookie lockout; saving an availability form nobody had ever submitted produced the flush ordering and the SQL leak behind it. None would have surfaced from reading the code, and none had a failing test until one was written afterwards. The build was green the entire time all four were live.

---

## Phase 6 — Dashboard, polish, and documentation

**Objective:** Turn a working application into a presentable one.

**Estimated: 5 hours**

### Tasks

- [x] ~~Dashboard KPI tiles from `/dashboard/summary`~~ — done in Phase 5; its exit criterion 6 ("observe the KPI change") is not verifiable against a placeholder
- [ ] Visits-per-day chart for the current week (Recharts, or Tailwind bars — the chart is not worth an extra dependency if time is short)
- [x] ~~Unassigned upcoming visits list, each linking to its assign flow~~ — done in Phase 5, since it arrives in the same `/dashboard/summary` response as the tiles
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
