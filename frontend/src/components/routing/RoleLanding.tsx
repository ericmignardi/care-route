import { Navigate } from "react-router";
import { landingPath, useAuthStore } from "../../stores/authStore";

/** "/" is not a screen — it is a question about who is asking. */
export function RoleLanding() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={landingPath(user)} replace />;
}
