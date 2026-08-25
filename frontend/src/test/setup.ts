import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";
import { useAuthStore } from "../stores/authStore";

/**
 * `error` rather than `warn` on an unhandled request. A test that silently talks to a
 * route MSW does not know about is a test asserting against `undefined`, and it will
 * usually still pass — which is the failure mode a mock server exists to prevent.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
  // The auth store is a module singleton, so it survives between test files. Anything
  // left signed in would leak a session into the next test's route guards.
  useAuthStore.setState({ user: null, status: "unknown" });
});

afterAll(() => server.close());

// jsdom implements neither of these, and both are read during a normal render:
// `matchMedia` by motion's reduced-motion check, `scrollTo` by the route transition.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.scrollTo = vi.fn();
