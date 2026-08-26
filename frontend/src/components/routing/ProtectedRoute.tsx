import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../../stores/authStore";
import { FullPageLoader } from "./FullPageLoader";

/**
 * The `unknown` branch is what makes a hard refresh keep the session: without it the router
 * decides the user is signed out in the frame before /auth/me answers.
 */
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "unknown") return <FullPageLoader />;

  if (status === "anonymous") {
    // Carry where they were headed so login can return them to it.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
