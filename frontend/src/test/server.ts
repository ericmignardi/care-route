import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { ProblemDetail } from "../types/api";

export const API = "http://localhost:8080/api/v1";

/**
 * The mock backend. Deliberately thin: these tests are about what the UI does with an
 * answer, not about re-implementing the domain in TypeScript — the business rules have
 * their own tests, against a real Postgres, on the side that actually enforces them.
 *
 * Handlers here are the *default* answers. A test that cares about a specific response
 * overrides one with `server.use(...)`, which `resetHandlers` undoes afterwards.
 */
export const server = setupServer(
  http.get(`${API}/auth/me`, () => HttpResponse.json(null, { status: 401 })),
);

/** An `application/problem+json` failure, shaped exactly as GlobalExceptionHandler emits one. */
export function problem(status: number, detail: string, rule?: string) {
  const body: ProblemDetail = { status, detail, title: "Conflict", ...(rule ? { rule } : {}) };
  return HttpResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export { http, HttpResponse };
