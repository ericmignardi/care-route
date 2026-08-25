import { Navigate, Outlet } from "react-router";
import { landingPath, useAuthStore } from "../../stores/authStore";
import { FullPageLoader } from "./FullPageLoader";

/** Keeps a signed-in user off the login and register screens. */
export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "unknown") return <FullPageLoader />;
  if (status === "authenticated") return <Navigate to={landingPath(user)} replace />;

  return <Outlet />;
}
