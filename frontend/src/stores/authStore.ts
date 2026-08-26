import { create } from "zustand";
import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { COORDINATOR_ROLES, type Role } from "../lib/constants";
import type { CurrentUser, LoginInput } from "../types/auth";

/**
 * "unknown" is the state before the hydration probe returns. The router must not decide
 * anything while it holds, or a hard refresh bounces a signed-in user to the login screen.
 */
export type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthState {
  user: CurrentUser | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

/**
 * Nothing is persisted to localStorage: the session lives in the httpOnly cookie and in
 * memory, so a logout cannot be undone by the back button restoring a stale store.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "unknown",

  async hydrate() {
    try {
      const user = await authApi.me();
      set({ user, status: "authenticated" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },

  async login(input) {
    await authApi.login(input);
    const user = await authApi.me();
    set({ user, status: "authenticated" });
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, status: "anonymous" });
    }
  },

  clear() {
    set({ user: null, status: "anonymous" });
  },
}));

/**
 * A 401 outside the auth probes means the cookie expired underneath us. Clearing the store
 * is enough — ProtectedRoute reacts and redirects, so no imperative navigation is needed.
 */
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status !== "anonymous") {
    useAuthStore.getState().clear();
  }
});

export function hasAnyRole(user: CurrentUser | null, roles: readonly Role[]): boolean {
  if (!user) return false;
  return user.roles.some((role) => (roles as readonly string[]).includes(role));
}

export function isCoordinator(user: CurrentUser | null): boolean {
  return hasAnyRole(user, COORDINATOR_ROLES);
}

export function landingPath(user: CurrentUser | null): string {
  return isCoordinator(user) ? "/dashboard" : "/my-visits";
}

export function initials(user: CurrentUser | null): string {
  if (!user) return "";
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function fullName(user: CurrentUser | null): string {
  return user ? `${user.firstName} ${user.lastName}` : "";
}
