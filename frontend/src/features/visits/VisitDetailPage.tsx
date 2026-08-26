import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button, ErrorState, SkeletonRows, StatusBadge } from "../../components/ui";
import { PageShell } from "../../components/layout/PageShell";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS } from "../../lib/constants";
import { formatDayLong, formatDuration, formatTime, toDateParam } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { VisitDetail } from "../../types/domain";
import { AssignCaregiverModal } from "./AssignCaregiverModal";

/**
 * Read-only about the field work, which is the line the server draws:
 * `VisitAccessGuard.requireViewAccess` lets a coordinator read, `requireOwnership` does not
 * let them check in. An actionable checkbox here would be a lie the API refuses.
 */
export function VisitDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const visit = useAsync(() => visitsApi.get(id), `visit ${id}`);

  if (visit.loading && !visit.data) {
    return (
      <PageShell>
        <SkeletonRows rows={8} />
      </PageShell>
    );
  }

  if (visit.error || !visit.data) {
    return (
      <PageShell>
        <ErrorState
          title="That visit did not load"
          message={errorMessage(visit.error, "The visit could not be found.")}
          onRetry={visit.reload}
        />
      </PageShell>
    );
  }

  const record = visit.data;
  const completed = record.tasks.filter((task) => task.completed).length;

  async function cancelVisit() {
    setCancelling(true);
    try {
      const updated = await visitsApi.cancel(record.id);
      visit.setData(updated);
      toast.info(
        "Visit cancelled",
        `${record.client.firstName} ${record.client.lastName}, ${formatTime(record.scheduledStart)}. Nobody will be sent.`,
      );
    } catch (error) {
      // BR-6: only a SCHEDULED visit can be cancelled, and the server says so in prose.
      toast.error("Could not cancel this visit", errorMessage(error));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="text-[11.5px] leading-none text-ink-3">
        <Link
          to={`/schedule?date=${toDateParam(new Date(record.scheduledStart))}`}
          className="hover:text-ink hover:underline"
        >
          Schedule
        </Link>
        <span className="px-1.5 text-ink-4">/</span>
        <Link to={`/clients/${record.client.id}`} className="hover:text-ink hover:underline">
          {record.client.firstName} {record.client.lastName}
        </Link>
        <span className="px-1.5 text-ink-4">/</span>
        <span className="font-semibold text-ink">{formatTime(record.scheduledStart)}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[32px] leading-[1.05] text-ink">
              {formatTime(record.scheduledStart)}&ndash;{formatTime(record.scheduledEnd)}
            </h1>
            <StatusBadge status={record.status} />
          </div>
          <p className="mt-2 text-[13px] leading-[1.4] text-ink-2">
            {formatDayLong(record.scheduledStart)} &middot;{" "}
            <Link to={`/clients/${record.client.id}`} className="font-semibold text-ink hover:underline">
              {record.client.firstName} {record.client.lastName}
            </Link>{" "}
            in {record.client.city} &middot; requires{" "}
            {SKILL_LABELS[record.requiredSkill].toLowerCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/schedule?date=${toDateParam(new Date(record.scheduledStart))}`)}
            icon={<ArrowLeft aria-hidden="true" className="size-3.5" />}
          >
            Back to the board
          </Button>

          {(record.status === "SCHEDULED" || !record.caregiver) && (
            <Button size="sm" variant="primary" onClick={() => setAssigning(true)}>
              {record.caregiver ? "Reassign" : "Assign caregiver"}
            </Button>
          )}

          {record.status === "SCHEDULED" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={cancelVisit}
              loading={cancelling}
              loadingLabel="Cancelling…"
            >
              Cancel visit
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap overflow-hidden rounded-[6px] border border-line-2 bg-panel">
        <Cell label="Caregiver">
          {record.caregiver ? (
            <Link
              to={`/caregivers/${record.caregiver.id}`}
              className="font-semibold text-ink hover:underline"
            >
              {record.caregiver.firstName} {record.caregiver.lastName}
            </Link>
          ) : (
            <span className="font-semibold text-mis-fg">Unassigned</span>
          )}
        </Cell>
        <Cell label="Checked in">
          {record.checkedInAt ? formatTime(record.checkedInAt) : "—"}
        </Cell>
        <Cell label="Checked out">
          {record.checkedOutAt ? formatTime(record.checkedOutAt) : "—"}
        </Cell>
        <Cell label="On site">
          {record.checkedInAt && record.checkedOutAt
            ? formatDuration(record.checkedInAt, record.checkedOutAt)
            : "—"}
        </Cell>
        <Cell label="Tasks" last>
          {completed} of {record.tasks.length} done
        </Cell>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="w-full overflow-hidden rounded-[6px] border border-line-2 bg-panel lg:w-[360px] lg:shrink-0">
          <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
            <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">This visit</h2>
          </header>
          <div className="px-[18px] py-4">
            <Timeline visit={record} />
          </div>
        </section>

        <section className="min-w-0 flex-1 overflow-hidden rounded-[6px] border border-line-2 bg-panel">
          <header className="border-b border-line-2 px-[18px] pt-[15px] pb-[13px]">
            <h2 className="text-[13.5px] leading-[1.2] font-semibold text-ink">Care plan</h2>
            <p className="mt-[3px] text-[11.5px] leading-[1.5] text-ink-3">
              Copied from the client&rsquo;s plan when the visit was scheduled, so editing the plan
              later cannot rewrite what this visit asked for. Only the assigned caregiver can tick
              these off.
            </p>
          </header>

          {record.tasks.length === 0 ? (
            <p className="px-[18px] py-4 text-[12.5px] leading-[1.6] text-ink-2">
              This visit carries no tasks &mdash; the client had an empty care plan when it was
              scheduled.
            </p>
          ) : (
            <ol>
              {record.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 border-b border-line px-[18px] py-2.5 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 text-[10px] font-bold",
                      task.completed
                        ? "border-pine bg-pine text-pine-on"
                        : "border-line-2 bg-bg text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[13px] leading-[1.4] font-medium",
                      task.completed ? "text-ink-3 line-through" : "text-ink",
                    )}
                  >
                    {task.description}
                  </span>
                  {task.completedAt && (
                    <span className="shrink-0 font-mono text-[10px] text-ink-3">
                      {formatTime(task.completedAt)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="border-t border-line-2 bg-bg px-[18px] py-4">
            <div className="label-caps text-[9.5px] text-ink-3">Note from the caregiver</div>
            <p className="mt-2 text-[13px] leading-[1.55] text-ink">
              {record.notes ?? (
                <span className="text-ink-3">Nothing recorded for this visit.</span>
              )}
            </p>
          </div>
        </section>
      </div>

      <AssignCaregiverModal
        open={assigning}
        visit={record}
        onClose={() => setAssigning(false)}
        onAssigned={(updated) => visit.setData(updated)}
      />
    </PageShell>
  );
}

function Cell({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn("min-w-[150px] flex-1 px-4 py-3", !last && "border-r border-line")}>
      <div className="label-caps text-[9.5px] text-ink-3">{label}</div>
      <div className="mt-1 text-[13px] leading-[1.4] font-semibold text-ink">{children}</div>
    </div>
  );
}

function Timeline({ visit }: { visit: VisitDetail }) {
  const steps = [
    {
      label: "Scheduled",
      value: formatTime(visit.scheduledStart),
      done: true,
      note: `Window closes ${formatTime(visit.scheduledEnd)}`,
    },
    {
      label: "Checked in",
      value: visit.checkedInAt ? formatTime(visit.checkedInAt) : "—",
      done: Boolean(visit.checkedInAt),
      note: visit.checkedInAt ? "On site" : "Not yet on site",
    },
    {
      label: "Checked out",
      value: visit.checkedOutAt ? formatTime(visit.checkedOutAt) : "—",
      done: Boolean(visit.checkedOutAt),
      note:
        visit.status === "CANCELLED"
          ? "Cancelled before it ran"
          : visit.checkedOutAt
            ? "Visit complete"
            : "Still open",
    },
  ];

  return (
    <ol>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={cn("relative flex items-start gap-3", index < steps.length - 1 && "pb-4")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold",
              step.done
                ? "border-pine bg-pine text-pine-on"
                : "border-dashed border-line-3 bg-bg text-transparent",
            )}
          >
            ✓
          </span>
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-5 bottom-0 left-[9.5px] w-[1.5px]",
                step.done ? "bg-pine-line" : "bg-line-2",
              )}
            />
          )}
          <span className="flex flex-1 items-start justify-between gap-3">
            <span>
              <span
                className={cn(
                  "block text-[14px] leading-[1.2] font-semibold",
                  step.done ? "text-ink" : "text-ink-3",
                )}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-[1.4] text-ink-3">{step.note}</span>
            </span>
            <span
              className={cn(
                "shrink-0 text-[14px] leading-[1.2] font-semibold",
                step.done ? "text-ink" : "text-ink-3",
              )}
            >
              {step.value}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
