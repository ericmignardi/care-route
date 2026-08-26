import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, CountUp, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { PageShell } from "../../components/layout/PageShell";
import { dashboardApi } from "../../api/dashboard";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS } from "../../lib/constants";
import { formatCountdown, formatDayLong, formatTime, toDateParam } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { Visit, VisitDetail } from "../../types/domain";
import { AssignCaregiverModal } from "../visits/AssignCaregiverModal";
import { WeekChart } from "./WeekChart";

export function DashboardPage() {
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState<VisitDetail | null>(null);

  const summary = useAsync(() => dashboardApi.summary(), "dashboard");
  const today = new Date();

  async function openAssign(visit: Visit) {
    try {
      setAssigning(await visitsApi.get(visit.id));
    } catch (error) {
      toast.error("Could not open that visit", errorMessage(error));
    }
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps text-[9.5px] text-ink-3">Operations</div>
          <h1 className="mt-2 font-display text-[30px] leading-[1.05] tracking-[-.015em] text-ink">
            {formatDayLong(today)}
          </h1>
        </div>
        <Button onClick={() => navigate(`/schedule?date=${toDateParam(today)}`)}>
          Open the schedule board
        </Button>
      </div>

      {summary.loading && !summary.data && <DashboardSkeleton />}

      {summary.failed && (
        <ErrorState
          title="The dashboard did not load"
          message={errorMessage(summary.error)}
          onRetry={summary.reload}
        />
      )}

      {summary.data && (
        <>
          <div className="flex flex-wrap gap-px overflow-hidden rounded-[6px] border border-line-2 bg-line-2">
            <Tile label="Visits today" value={summary.data.visitsToday}>
              <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-2">
                {summary.data.inProgress} running &middot; {summary.data.unassignedUpcoming}{" "}
                unassigned from today on
              </p>
            </Tile>

            <Tile
              label="Unassigned"
              value={summary.data.unassignedUpcoming}
              tone="alert"
              icon={<AlertTriangle aria-hidden="true" className="size-3.5 text-mis-fg" />}
            >
              {summary.data.unassignedUpcoming > 0 ? (
                <p className="mt-4 text-[11.5px] leading-[1.5] font-semibold text-mis-fg">
                  Nobody is coming to these yet.
                </p>
              ) : (
                <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-2">
                  Everything upcoming has a caregiver.
                </p>
              )}
            </Tile>

            <Tile label="In progress" value={summary.data.inProgress}>
              <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-2">
                Caregivers currently checked in and on site.
              </p>
            </Tile>

            <Tile
              label="Completion rate"
              value={summary.data.completionRate * 100}
              format={(value) => value.toFixed(1)}
              suffix="%"
            >
              <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-2">
                This week, completed against completed plus missed. Cancellations are excluded.
              </p>
            </Tile>
          </div>

          <div className="flex flex-col items-stretch gap-[18px] xl:flex-row">
            <div className="min-w-0 flex-1">
              <WeekChart days={summary.data.visitsThisWeek} />
            </div>

            <section className="flex w-full flex-col overflow-hidden rounded-[6px] border border-line-2 bg-panel xl:w-[592px] xl:flex-none">
              <header className="border-b border-line-2 px-[18px] pt-[15px] pb-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                  <h2 className="text-[13px] leading-[1.2] font-semibold text-ink">
                    Unassigned &mdash; soonest first
                  </h2>
                  {summary.data.unassignedUpcomingVisits.length > 0 && (
                    <span className="text-[11px] leading-none font-bold text-mis-fg">
                      {summary.data.unassignedUpcomingVisits.length} waiting
                    </span>
                  )}
                </div>
                <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
                  Ordered by how soon someone is expecting a caregiver.
                </p>
              </header>

              {summary.data.unassignedUpcomingVisits.length === 0 ? (
                <div className="p-[18px]">
                  <EmptyState
                    glyph="&#x2713;"
                    title="Nothing is waiting"
                    description="Every upcoming visit has someone assigned to it. The schedule board is the place to look at how the day is actually laid out."
                    action={
                      <Button onClick={() => navigate(`/schedule?date=${toDateParam(today)}`)}>
                        Open the schedule board
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="hidden border-b border-line bg-sunken px-[18px] py-[7px] font-mono text-[9.5px] leading-none font-semibold tracking-[.1em] text-ink-3 uppercase sm:flex">
                    <span className="w-[104px] shrink-0">Time</span>
                    <span className="min-w-0 flex-1">Client</span>
                    <span className="w-[110px] shrink-0">Skill</span>
                    <span className="w-[96px] shrink-0">Starts in</span>
                    <span className="w-[72px] shrink-0" />
                  </div>

                  <AnimatePresence initial={false}>
                    {summary.data.unassignedUpcomingVisits.map((visit) => {
                      const overdue = new Date(visit.scheduledStart).getTime() < today.getTime();

                      return (
                        <motion.div
                          key={visit.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            "flex flex-wrap items-center gap-y-2 border-b border-line px-[18px] py-2.5 last:border-b-0",
                            overdue && "bg-mis-bg",
                          )}
                        >
                          <span
                            className={cn(
                              "w-[104px] shrink-0 text-[12.5px] leading-[1.3] font-semibold",
                              overdue ? "text-mis-fg" : "text-ink",
                            )}
                          >
                            {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/visits/${visit.id}`)}
                              className="block cursor-pointer truncate text-left text-[12.5px] leading-[1.3] font-semibold text-ink hover:underline"
                            >
                              {visit.client.firstName} {visit.client.lastName}
                            </button>
                            <span className="block truncate text-[11px] leading-[1.4] text-ink-2">
                              {visit.client.city} &middot; {formatDayLong(visit.scheduledStart)}
                            </span>
                          </span>

                          <span className="w-[110px] shrink-0 font-mono text-[9.5px] leading-none font-bold text-ink-2">
                            {SKILL_LABELS[visit.requiredSkill].toUpperCase()}
                          </span>

                          <span
                            className={cn(
                              "w-[96px] shrink-0 text-[12px] leading-[1.3] font-semibold",
                              overdue ? "text-mis-fg" : "text-ink-2",
                            )}
                          >
                            {formatCountdown(visit.scheduledStart, today)}
                          </span>

                          <span className="w-[72px] shrink-0">
                            <Button
                              size="sm"
                              variant={overdue ? "destructive" : "primary"}
                              onClick={() => openAssign(visit)}
                              aria-label={`Assign a caregiver to ${visit.client.firstName} ${visit.client.lastName} at ${formatTime(visit.scheduledStart)}`}
                            >
                              Assign
                            </Button>
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </>
              )}
            </section>
          </div>
        </>
      )}

      <AssignCaregiverModal
        open={Boolean(assigning)}
        visit={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={summary.reload}
      />
    </PageShell>
  );
}

function Tile({
  label,
  value,
  format,
  suffix,
  tone,
  icon,
  children,
}: {
  label: string;
  value: number;
  format?: (value: number) => string;
  suffix?: string;
  tone?: "alert";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const alert = tone === "alert";

  return (
    <div
      className={cn(
        "relative min-w-[220px] flex-1 px-[18px] pt-4 pb-[15px]",
        alert ? "bg-mis-bg" : "bg-panel",
      )}
    >
      {alert && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-mis-fg" />}
      <div className="flex items-center gap-1.5">
        <span className={cn("label-caps text-[9.5px]", alert ? "text-mis-fg" : "text-ink-3")}>
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <CountUp
          value={value}
          format={format}
          className={cn(
            "font-display text-[44px] leading-none tracking-[-.01em]",
            alert ? "text-mis-fg" : "text-ink",
          )}
        />
        {suffix && <span className="font-display text-[20px] leading-none text-ink-3">{suffix}</span>}
      </div>
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading the dashboard" className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-px overflow-hidden rounded-[6px] border border-line-2 bg-line-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="min-w-[220px] flex-1 bg-panel px-[18px] pt-4 pb-[15px]">
            <Skeleton lead={index === 0} className="h-[9px] w-[90px]" />
            <Skeleton className="mt-3 h-[36px] w-[70px]" />
            <Skeleton className="mt-4 h-[10px] w-[85%]" />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-stretch gap-[18px] xl:flex-row">
        <div className="min-w-0 flex-1 rounded-[6px] border border-line-2 bg-panel px-5 pt-[18px] pb-3.5">
          <Skeleton lead className="h-[11px] w-[110px]" />
          <Skeleton className="mt-2 h-[9px] w-[210px]" />
          <div className="mt-5 flex h-[216px] items-end gap-3.5 border-b border-line-2">
            {[62, 88, 54, 96, 71, 40, 34].map((height, index) => (
              <Skeleton key={index} className="flex-1" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-[6px] border border-line-2 bg-panel xl:w-[592px] xl:flex-none">
          <div className="border-b border-line-2 px-[18px] pt-[15px] pb-3">
            <Skeleton lead className="h-[11px] w-[160px]" />
            <Skeleton className="mt-2 h-[9px] w-[240px]" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-line px-[18px] py-3">
              <Skeleton className="h-[11px] w-[88px]" />
              <Skeleton className="h-[11px] flex-1" />
              <Skeleton className="h-[11px] w-[64px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
