import { Navigate, Outlet } from "react-router";
import { hasAnyRole, landingPath, useAuthStore } from "../../stores/authStore";
import type { Role } from "../../lib/constants";

/**
 * Redirects rather than rendering a 403 page: a caregiver who follows a stale link to
 * /clients wants their own day, not an apology. The API refuses independently, so this
 * is about not showing a screen that would only fill with errors.
 */
export function RoleRoute({ roles }: { roles: readonly Role[] }) {
  const user = useAuthStore((state) => state.user);

  if (!hasAnyRole(user, roles)) {
    return <Navigate to={landingPath(user)} replace />;
  }

  return <Outlet />;
}
