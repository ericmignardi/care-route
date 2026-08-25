import { CalendarDays, ClipboardList, LayoutDashboard, Users, UserRound } from "lucide-react";
import { COORDINATOR_ROLES, type Role } from "./constants";
import type { CurrentUser } from "../types/auth";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Roles that may see the link. The route guard enforces it again server-side of the UI. */
  roles: readonly Role[];
}

const ALL_ROLES: readonly Role[] = ["ROLE_ADMIN", "ROLE_COORDINATOR", "ROLE_CAREGIVER"];

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: COORDINATOR_ROLES },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, roles: COORDINATOR_ROLES },
  { to: "/clients", label: "Clients", icon: Users, roles: COORDINATOR_ROLES },
  { to: "/caregivers", label: "Caregivers", icon: UserRound, roles: COORDINATOR_ROLES },
  { to: "/my-visits", label: "My day", icon: ClipboardList, roles: ALL_ROLES },
];

/**
 * Hiding a link is a courtesy, not a control — every one of these routes is also guarded
 * by RoleRoute, and the API refuses regardless of what the UI renders.
 */
export function navFor(user: CurrentUser | null): NavItem[] {
  if (!user) return [];
  return NAV_ITEMS.filter((item) =>
    item.roles.some((role) => user.roles.includes(role)),
  );
}
