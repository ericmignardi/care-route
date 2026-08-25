import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ProblemDetail } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";

/**
 * `withCredentials` is the whole point: the JWT lives in an httpOnly cookie the browser
 * attaches itself. Nothing here ever reads or stores a token — it cannot, and that is
 * what makes XSS unable to steal the session.
 */
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

/**
 * Requests whose 401 is an answer rather than an expired session. Logging in with a bad
 * password must surface as a form error, and the hydration probe on load is *expected*
 * to 401 for a signed-out visitor; bouncing either to /login would either swallow the
 * message or fight the router on first paint.
 */
const AUTH_PROBES = ["/auth/login", "/auth/register", "/auth/me"];

let onUnauthorized: (() => void) | null = null;

/**
 * Registered by the app once the store exists. Keeping it a callback rather than an
 * import is what stops api/ and stores/ from importing each other in a cycle.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    const url = error.config?.url ?? "";
    const isProbe = AUTH_PROBES.some((path) => url.startsWith(path));

    if (error.response?.status === 401 && !isProbe) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Narrows an unknown caught value to the RFC 7807 body, when there is one. */
export function toProblem(error: unknown): ProblemDetail | null {
  if (!axios.isAxiosError(error)) return null;
  const data = (error as AxiosError<ProblemDetail>).response?.data;
  return data && typeof data === "object" ? data : null;
}

/**
 * The sentence to show a user. Prefers the server's `detail`, which is written to be
 * read out loud — "Marcus is already booked 10:00–11:30" — and only falls back to
 * something generic when there is genuinely nothing better.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  const problem = toProblem(error);
  if (problem?.detail) return problem.detail;
  if (axios.isAxiosError(error) && error.code === "ERR_NETWORK") {
    return "Could not reach CareRoute. Check your connection and try again.";
  }
  return fallback;
}

/** The business rule that rejected the request, when the failure was a domain one. */
export function errorRule(error: unknown): string | null {
  return toProblem(error)?.rule ?? null;
}

/** The bean-validation field map, for replaying server-side errors onto a form. */
export function fieldErrors(error: unknown): Record<string, string> {
  return toProblem(error)?.errors ?? {};
}
