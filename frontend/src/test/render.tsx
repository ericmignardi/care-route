import type { ReactElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "../context/ThemeProvider";
import { routes } from "../routes";
import { useAuthStore } from "../stores/authStore";
import type { CurrentUser } from "../types/auth";

/**
 * `MotionConfig transition={{ duration: 0 }}` collapses every animation in the tree to a
 * single frame. Without it, `AnimatePresence` keeps exiting nodes mounted for the length
 * of their transition and assertions race the easing curve — which produces a suite that
 * passes on a fast machine and fails in CI.
 */
function Providers({ children }: { children: ReactElement }) {
  return (
    <ThemeProvider>
      <MotionConfig transition={{ duration: 0 }}>{children}</MotionConfig>
    </ThemeProvider>
  );
}

/** Renders a component in isolation, inside a router so links and navigation resolve. */
export function renderComponent(ui: ReactElement): RenderResult {
  return render(
    <Providers>
      <MemoryRouter>{ui}</MemoryRouter>
    </Providers>,
  );
}

/**
 * Mounts the real route tree at a path, with the store already in the state a signed-in
 * (or signed-out) visitor would leave it in. This is what makes the guard tests worth
 * anything: they exercise the routing the application actually ships.
 */
export function renderApp(path: string, user: CurrentUser | null): RenderResult {
  useAuthStore.setState({ user, status: user ? "authenticated" : "anonymous" });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
