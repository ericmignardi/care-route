import { Link } from "react-router";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { landingPath, useAuthStore } from "../stores/authStore";

export function NotFoundPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="mx-auto max-w-[560px] px-4 py-16">
      <EmptyState
        glyph="?"
        title="No such page"
        description="The link may be stale, or the screen may not exist yet. Everything CareRoute can do is reachable from the navigation."
        action={
          <Link to={user ? landingPath(user) : "/login"}>
            <Button variant="primary" size="sm">
              {user ? "Back to your day" : "Sign in"}
            </Button>
          </Link>
        }
      />
    </div>
  );
}
