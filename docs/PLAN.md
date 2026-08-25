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
