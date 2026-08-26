import { Navigate } from "react-router";
import { landingPath, useAuthStore } from "../../stores/authStore";

export function RoleLanding() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={landingPath(user)} replace />;
}
