import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { controlClasses } from "../../components/ui/controlClasses";
import { PageShell } from "../../components/layout/PageShell";
import { visitsApi } from "../../api/visits";
import { caregiversApi } from "../../api/caregivers";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { toast } from "../../stores/toastStore";
import { VISIT_STATUSES, VISIT_STATUS_META, type VisitStatus } from "../../lib/constants";
import {
  addDays,
  dayBounds,
  formatDayLong,
  fromDateParam,
  isToday,
  startOfDay,
  toDateParam,
} from "../../lib/dates";
import { LABEL_WIDTH } from "../../lib/schedule";
import { cn } from "../../lib/cn";
import type { Visit, VisitDetail } from "../../types/domain";
import { ScheduleBoard } from "./ScheduleBoard";
import { ScheduleVisitModal } from "./ScheduleVisitModal";
import { AssignCaregiverModal } from "./AssignCaregiverModal";

/**
 * The board's day lives in the query string rather than in component state, so a
 * coordinator can send "the schedule for Thursday" as a link and the back button steps
 * through the days they actually looked at.
 */
export function SchedulePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const day = fromDateParam(params.get("date"));
  const [status, setStatus] = useState<VisitStatus | "">("");
  const [query, setQuery] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [assigning, setAssigning] = useState<VisitDetail | null>(null);

  const bounds = useMemo(() => dayBounds(day), [day]);

  const visits = useAsync(
    () => visitsApi.list({ from: bounds.from, to: bounds.to, status, size: 100 }),
    `board ${bounds.from} ${status}`,
  );

  const caregivers = useAsync(() => caregiversApi.list({ status: "ACTIVE", size: 100 }), "board-caregivers");

  function goToDay(next: Date) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("date", toDateParam(next));
        return updated;
      },
      { replace: false },
    );
  }

  /**
   * Filtering here rather than server-side: the day is already fully loaded, and a
   * round trip per keystroke would make the board flicker for a filter that is really a
   * "find the row I mean" affordance.
   */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visits.data?.content ?? [];
    return (visits.data?.content ?? []).filter((visit) => {
      const client = `${visit.client.firstName} ${visit.client.lastName}`.toLowerCase();
      const caregiver = visit.caregiver
        ? `${visit.caregiver.firstName} ${visit.caregiver.lastName}`.toLowerCase()
        : "";
      return client.includes(needle) || caregiver.includes(needle);
    });
  }, [visits.data, query]);

  const visibleCaregivers = useMemo(() => {
    const all = caregivers.data?.content ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;

    // Keep a lane if the caregiver matches, or if one of their surviving visits does —
    // searching a client's name should reveal who is going, not empty the board.
    const withVisits = new Set(filtered.map((visit) => visit.caregiver?.id).filter(Boolean));
    return all.filter(
      (caregiver) =>
        withVisits.has(caregiver.id) ||
        `${caregiver.firstName} ${caregiver.lastName}`.toLowerCase().includes(needle),
    );
  }, [caregivers.data, filtered, query]);

  async function openAssign(visit: Visit) {
    try {
      // The board holds a summary; the assign modal needs the full record, and fetching
      // it here means the modal never renders against a half-populated visit.
      setAssigning(await visitsApi.get(visit.id));
    } catch (error) {
      toast.error("Could not open that visit", errorMessage(error));
    }
  }

  const loading = visits.loading || caregivers.loading;
  const failed = visits.failed || caregivers.failed;
  const failure = visits.error ?? caregivers.error;

  return (
    <PageShell className="max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps text-[9.5px] text-ink-3">Operations</div>
          <h1 className="mt-2 font-display text-[30px] leading-[1.05] tracking-[-.015em] text-ink">
            {formatDayLong(day)}
          </h1>
        </div>
        <Button
          variant="primary"
          onClick={() => setScheduling(true)}
          icon={<Plus aria-hidden="true" className="size-3.5" />}
        >
          New visit
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex overflow-hidden rounded-[5px] border border-line-2 bg-panel">
          <button
            type="button"
            onClick={() => goToDay(addDays(day, -1))}
            aria-label="Previous day"
            className="flex size-[30px] cursor-pointer items-center justify-center border-r border-line text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
          </button>
          <span className="px-3.5 text-[12.5px] leading-[30px] font-semibold text-ink">
            {formatDayLong(day)}
          </span>
          <button
            type="button"
            onClick={() => goToDay(addDays(day, 1))}
            aria-label="Next day"
            className="flex size-[30px] cursor-pointer items-center justify-center border-l border-line text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>

        <Button size="sm" onClick={() => goToDay(startOfDay(new Date()))} disabled={isToday(day)}>
          Today
        </Button>

        <span aria-hidden="true" className="h-[22px] w-px bg-line" />

        <div
          role="group"
          aria-label="Filter by status"
          className="flex overflow-hidden rounded-[5px] border border-line-2"
        >
          <button
            type="button"
            aria-pressed={status === ""}
            onClick={() => setStatus("")}
            className={cn(
              "h-[30px] cursor-pointer px-3 text-[12px] leading-none font-semibold",
              status === "" ? "bg-ink text-bg" : "bg-panel text-ink-2 hover:bg-sunken hover:text-ink",
            )}
          >
            All
          </button>
          {VISIT_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                "h-[30px] cursor-pointer border-l border-line-2 px-3 text-[12px] leading-none font-semibold",
                status === value
                  ? "bg-ink text-bg"
                  : "bg-panel text-ink-2 hover:bg-sunken hover:text-ink",
              )}
            >
              {VISIT_STATUS_META[value].label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] flex-1 sm:max-w-[300px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[10px] size-3.5 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client or caregiver"
            aria-label="Search the board"
            className={controlClasses(false, "sm", "pl-[30px]")}
          />
        </div>
      </div>

      {loading && !visits.data && <BoardSkeleton />}

      {failed && (
        <ErrorState
          title="The schedule did not load"
          message={errorMessage(failure)}
          onRetry={() => {
            visits.reload();
            caregivers.reload();
          }}
        />
      )}

      {visits.data && caregivers.data && (
        <>
          {caregivers.data.content.length === 0 ? (
            <EmptyState
              glyph="0"
              title="No active caregivers"
              description="The board has no lanes to draw. Add a caregiver and give them availability before scheduling anything."
              action={
                <Button variant="primary" onClick={() => navigate("/caregivers")}>
                  Go to caregivers
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              glyph="0"
              title={
                query || status
                  ? "Nothing on this day matches those filters"
                  : `Nothing scheduled for ${formatDayLong(day)}`
              }
              description={
                query || status
                  ? "Clear the filters to see the whole day."
                  : "A quiet day, or one nobody has planned yet. Scheduling a visit copies the client's care plan onto it."
              }
              action={
                query || status ? (
                  <Button
                    onClick={() => {
                      setQuery("");
                      setStatus("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setScheduling(true)}>
                    Schedule a visit
                  </Button>
                )
              }
            />
          ) : (
            <ScheduleBoard
              caregivers={visibleCaregivers}
              visits={filtered}
              now={isToday(day) ? new Date() : null}
              onOpenVisit={(visit) => navigate(`/visits/${visit.id}`)}
              onAssign={openAssign}
            />
          )}
        </>
      )}

      <ScheduleVisitModal
        open={scheduling}
        defaultDate={day}
        onClose={() => setScheduling(false)}
        onScheduled={(visit) => {
          visits.reload();
          setAssigning(visit);
        }}
      />

      <AssignCaregiverModal
        open={Boolean(assigning)}
        visit={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={visits.reload}
      />
    </PageShell>
  );
}

function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the schedule"
      className="overflow-hidden rounded-[6px] border border-line-2 bg-bg"
    >
      <div className="flex h-[76px] items-center border-b-2 border-mis-bd bg-mis-bg px-3">
        <Skeleton lead className="h-[11px] w-[190px]" />
      </div>
      <div className="flex h-[30px] items-center border-b border-line-2 bg-sunken px-3">
        <Skeleton className="h-[9px] w-[120px]" />
      </div>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex h-[46px] items-center border-b border-line">
          <div
            className="flex shrink-0 items-center gap-2 border-r border-line-2 bg-panel px-3"
            style={{ width: LABEL_WIDTH, height: "100%" }}
          >
            <Skeleton className="size-[22px] rounded-full" />
            <Skeleton className="h-[10px] flex-1" />
          </div>
          <div className="flex flex-1 items-center gap-3 px-3">
            <Skeleton className="h-[36px] w-[150px] rounded-[3px]" />
            <Skeleton className="h-[36px] w-[220px] rounded-[3px]" />
            <Skeleton className="h-[36px] w-[90px] rounded-[3px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
