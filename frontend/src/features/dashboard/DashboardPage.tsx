import { PagePlaceholder } from "../../components/layout/PagePlaceholder";

export function DashboardPage() {
  return (
    <PagePlaceholder
      eyebrow="Coordinator"
      title="Dashboard"
      description="Visits today, unassigned, in progress and completion rate, with the week's shape underneath."
      next="Phase 6 wires the KPI tiles to /dashboard/summary and lists the unassigned upcoming visits, each linking into the assign flow."
    />
  );
}
