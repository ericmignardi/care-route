import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ProblemDetail } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";

/**
 * `withCredentials` is the whole point: the JWT lives in an httpOnly cookie the browser
 * attaches itself, and nothing here ever reads or stores a token.
 */
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

/**
 * Requests whose 401 is an answer rather than an expired session — a bad password must
 * surface as a form error, and the hydration probe is expected to 401 when signed out.
 */
const AUTH_PROBES = ["/auth/login", "/auth/register", "/auth/me"];

let onUnauthorized: (() => void) | null = null;

/** A callback rather than an import, so api/ and stores/ do not form a cycle. */
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

export function toProblem(error: unknown): ProblemDetail | null {
  if (!axios.isAxiosError(error)) return null;
  const data = (error as AxiosError<ProblemDetail>).response?.data;
  return data && typeof data === "object" ? data : null;
}

/** Prefers the server's `detail`, which is written to be read out loud. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  const problem = toProblem(error);
  if (problem?.detail) return problem.detail;
  if (axios.isAxiosError(error) && error.code === "ERR_NETWORK") {
    return "Could not reach CareRoute. Check your connection and try again.";
  }
  return fallback;
}

export function errorRule(error: unknown): string | null {
  return toProblem(error)?.rule ?? null;
}

export function fieldErrors(error: unknown): Record<string, string> {
  return toProblem(error)?.errors ?? {};
}
