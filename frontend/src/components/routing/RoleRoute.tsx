import { Navigate, Outlet } from "react-router";
import { hasAnyRole, landingPath, useAuthStore } from "../../stores/authStore";
import type { Role } from "../../lib/constants";

/**
 * Redirects rather than rendering a 403. The API refuses independently, so this only keeps
 * a screen that would fill with errors from mounting at all.
 */
export function RoleRoute({ roles }: { roles: readonly Role[] }) {
  const user = useAuthStore((state) => state.user);

  if (!hasAnyRole(user, roles)) {
    return <Navigate to={landingPath(user)} replace />;
  }

  return <Outlet />;
}
