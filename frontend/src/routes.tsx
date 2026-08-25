import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { PublicOnlyRoute } from "./components/routing/PublicOnlyRoute";
import { RoleRoute } from "./components/routing/RoleRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ClientsPage } from "./features/clients/ClientsPage";
import { ClientDetailPage } from "./features/clients/ClientDetailPage";
import { CaregiversPage } from "./features/caregivers/CaregiversPage";
import { CaregiverDetailPage } from "./features/caregivers/CaregiverDetailPage";
import { SchedulePage } from "./features/visits/SchedulePage";
import { VisitDetailPage } from "./features/visits/VisitDetailPage";
import { MyVisitsPage } from "./features/visits/MyVisitsPage";
import { MyVisitDetailPage } from "./features/visits/MyVisitDetailPage";
import { NotFoundPage } from "./features/NotFoundPage";
import { RoleLanding } from "./components/routing/RoleLanding";
import { COORDINATOR_ROLES } from "./lib/constants";

/**
 * Two surfaces, not one. `/visits/:id` is the coordinator's read of a visit and is
 * role-gated; `/my-visits/:id` is the caregiver's field screen for the same row and is
 * not, because "the caregiver this visit is assigned to" is a relationship the server
 * checks per row (BR-7), not a role the router can decide from.
 */
/**
 * The route tree, exported separately from the browser router so the tests can mount the
 * same tree under a memory router. A guard tested against a hand-built route table is a
 * guard tested against a table that can drift from the one that ships.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <RoleLanding /> },
          {
            element: <RoleRoute roles={COORDINATOR_ROLES} />,
            children: [
              { path: "dashboard", element: <DashboardPage /> },
              { path: "schedule", element: <SchedulePage /> },
              { path: "clients", element: <ClientsPage /> },
              { path: "clients/:id", element: <ClientDetailPage /> },
              { path: "caregivers", element: <CaregiversPage /> },
              { path: "caregivers/:id", element: <CaregiverDetailPage /> },
              { path: "visits/:id", element: <VisitDetailPage /> },
            ],
          },
          { path: "my-visits", element: <MyVisitsPage /> },
          { path: "my-visits/:id", element: <MyVisitDetailPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
