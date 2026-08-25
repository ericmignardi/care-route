import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { PublicOnlyRoute } from "./components/routing/PublicOnlyRoute";
import { RoleRoute } from "./components/routing/RoleRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ClientsPage } from "./features/clients/ClientsPage";
import { CaregiversPage } from "./features/caregivers/CaregiversPage";
import { SchedulePage } from "./features/visits/SchedulePage";
import { MyVisitsPage } from "./features/visits/MyVisitsPage";
import { NotFoundPage } from "./features/NotFoundPage";
import { RoleLanding } from "./components/routing/RoleLanding";
import { COORDINATOR_ROLES } from "./lib/constants";

export const router = createBrowserRouter([
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
              { path: "caregivers", element: <CaregiversPage /> },
            ],
          },
          { path: "my-visits", element: <MyVisitsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
