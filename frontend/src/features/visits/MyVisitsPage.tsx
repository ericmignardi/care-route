import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, ErrorState, Skeleton } from "../../components/ui";
import { visitsApi } from "../../api/visits";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { useAuthStore, fullName, initials } from "../../stores/authStore";
import { toast } from "../../stores/toastStore";
import { SKILL_LABELS, VISIT_STATUS_META } from "../../lib/constants";
import {
  addDays,
  formatDayLong,
  formatDuration,
  formatTime,
  fromDateParam,
  isToday,
  startOfDay,
  toDateParam,
} from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { Visit } from "../../types/domain";

const DONE_STATUSES = new Set(["COMPLETED", "CANCELLED", "MISSED"]);

/**
 * The caregiver's day, built mobile-first at 375px. This is a different product from the
 * coordinator's board and deliberately does not share its layout: Dana reads sixty rows
 * in an office, Marcus makes three large decisions on a cold porch with gloves on. The
 * primary action is never below the fold and never smaller than 52px.
 */
export function MyVisitsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const day = fromDateParam(params.get("date"));
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // Keyed on the formatted day, not the Date: `fromDateParam` builds a new instance
  // every render, and a Date in a dependency array never compares equal to itself.
  const visits = useAsync(() => visitsApi.myVisits(toDateParam(day)), `my-visits ${toDateParam(day)}`);

  function goToDay(next: Date) {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("date", toDateParam(next));
      return updated;
    });
  }

  const { done, current, later } = useMemo(() => {
    const all = [...(visits.data ?? [])].sort((a, b) =>
      a.scheduledStart.localeCompare(b.scheduledStart),
    );
    const finished = all.filter((visit) => DONE_STATUSES.has(visit.status));
    const open = all.filter((visit) => !DONE_STATUSES.has(visit.status));

    // Whatever is running wins; otherwise the next one due is the card that gets the
    // full treatment. Everything after it is a compact row.
    const running = open.find((visit) => visit.status === "IN_PROGRESS");
    const head = running ?? open[0] ?? null;

    return {
      done: finished,
      current: head,
      later: open.filter((visit) => visit.id !== head?.id),
    };
  }, [visits.data]);

  async function checkIn(visit: Visit) {
    setCheckingIn(visit.id);
    try {
      await visitsApi.checkIn(visit.id);
      toast.success("Checked in", `${visit.client.firstName} ${visit.client.lastName}. Timer running.`);
      navigate(`/my-visits/${visit.id}`);
    } catch (error) {
      // BR-4: outside the tolerance window the server refuses, and its sentence names
      // the time check-in actually opens. That is the useful thing to show.
      toast.error("Cannot check in yet", errorMessage(error));
    } finally {
      setCheckingIn(null);
    }
  }

  const total = (visits.data ?? []).length;
  const completedCount = (visits.data ?? []).filter((visit) => visit.status === "COMPLETED").length;

  return (
    <div className="mx-auto w-full max-w-[560px] px-[18px] pb-10">
      <header className="flex items-center gap-3 border-b border-line py-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-pine-line bg-pine-tint text-[11px] font-semibold text-pine-acc"
        >
          {initials(user)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] leading-[1.2] font-bold text-ink">
            {fullName(user)}
          </div>
          <div className="text-[11.5px] leading-[1.3] text-ink-3">Hamilton West team</div>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-[5px] border border-line-2 bg-panel">
          <button
            type="button"
            onClick={() => goToDay(addDays(day, -1))}
            aria-label="Previous day"
            className="flex size-[30px] cursor-pointer items-center justify-center border-r border-line text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => goToDay(addDays(day, 1))}
            aria-label="Next day"
            className="flex size-[30px] cursor-pointer items-center justify-center text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="pt-4 pb-3">
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[27px] leading-[1.05] text-ink">
            {formatDayLong(day)}
          </h1>
          {total > 0 && (
            <span className="shrink-0 text-[12.5px] leading-[1.4] font-bold text-ink-2">
              {completedCount} of {total} done
            </span>
          )}
        </div>
        {total > 0 && (
          <div
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Visits completed today"
            className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-sunken"
          >
            <span
              className="block h-full bg-pine transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${total === 0 ? 0 : (completedCount / total) * 100}%` }}
            />
          </div>
        )}
        {!isToday(day) && (
          <button
            type="button"
            onClick={() => goToDay(startOfDay(new Date()))}
            className="mt-3 cursor-pointer text-[12.5px] leading-none font-semibold text-pine-acc hover:underline"
          >
            Back to today
          </button>
        )}
      </div>

      {visits.loading && !visits.data && <DaySkeleton />}

      {visits.failed && (
        <ErrorState
          title="Your day did not load"
          message={errorMessage(visits.error)}
          onRetry={visits.reload}
        />
      )}

      {visits.data && total === 0 && (
        <div className="flex flex-col justify-center py-10">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-[16px] border-[1.5px] border-line-2 bg-panel font-display text-[24px] text-ink-3"
          >
            0
          </span>
          <h2 className="mt-5 font-display text-[25px] leading-[1.15] text-ink">
            No visits scheduled {isToday(day) ? "today" : "this day"}
          </h2>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-2">
            Nothing is assigned to you for {formatDayLong(day)}. If that looks wrong, your
            coordinator can see the same schedule and reassign.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button size="lg" variant="primary" fullWidth onClick={() => goToDay(addDays(day, 1))}>
              See the next day
            </Button>
            {!isToday(day) && (
              <Button size="lg" fullWidth onClick={() => goToDay(startOfDay(new Date()))}>
                Back to today
              </Button>
            )}
          </div>
        </div>
      )}

      {visits.data && total > 0 && (
        <div className="flex flex-col">
          {done.length > 0 && (
            <>
              <SectionRule label="Done" />
              {done.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => navigate(`/my-visits/${visit.id}`)}
                  className="mb-2 flex w-full cursor-pointer items-center gap-3 rounded-[9px] border border-line bg-panel px-3.5 py-3 text-left opacity-90 hover:opacity-100"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-[26px] shrink-0 items-center justify-center rounded-full border text-[12px] font-bold",
                      visit.status === "COMPLETED"
                        ? "border-don-bd bg-don-bg text-don-fg"
                        : visit.status === "MISSED"
                          ? "border-mis-bd bg-mis-bg text-mis-fg"
                          : "border-can-bd bg-can-bg text-can-fg",
                    )}
                  >
                    {VISIT_STATUS_META[visit.status].glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] leading-[1.25] font-semibold text-ink-2">
                      {visit.client.firstName} {visit.client.lastName}
                    </span>
                    <span className="block text-[12px] leading-[1.4] text-ink-3">
                      {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
                      {visit.checkedInAt && visit.checkedOutAt
                        ? ` · ${formatDuration(visit.checkedInAt, visit.checkedOutAt)} on site`
                        : ` · ${VISIT_STATUS_META[visit.status].label}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] leading-none font-medium text-ink-4">
                    View
                  </span>
                </button>
              ))}
            </>
          )}

          {current && (
            <>
              <SectionRule
                label={current.status === "IN_PROGRESS" ? "On site now" : "Next visit"}
                accent
              />
              <article className="overflow-hidden rounded-[12px] border-[1.5px] border-pine bg-panel">
                <div className="px-4 pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-[30px] leading-none text-ink">
                      {formatTime(current.scheduledStart)}&ndash;{formatTime(current.scheduledEnd)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-[4px] border px-2 py-[5px] text-[11px] leading-none font-bold",
                        current.status === "IN_PROGRESS"
                          ? "border-prg-bd bg-prg-bg text-prg-fg"
                          : "border-line-2 bg-sunken text-ink-2",
                      )}
                    >
                      {current.status === "IN_PROGRESS"
                        ? "ON SITE"
                        : SKILL_LABELS[current.requiredSkill].toUpperCase()}
                    </span>
                  </div>

                  <h2 className="mt-3 text-[20px] leading-[1.25] font-semibold text-ink">
                    {current.client.firstName} {current.client.lastName}
                  </h2>
                  <p className="mt-1 text-[14px] leading-[1.45] text-ink-2">{current.client.city}</p>
                </div>

                <div className="px-4 pt-3.5 pb-4">
                  {current.status === "IN_PROGRESS" ? (
                    <Button
                      size="lg"
                      variant="primary"
                      fullWidth
                      className="!h-[68px] !text-[20px]"
                      onClick={() => navigate(`/my-visits/${current.id}`)}
                    >
                      Continue visit
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="primary"
                      fullWidth
                      className="!h-[68px] !text-[20px]"
                      loading={checkingIn === current.id}
                      loadingLabel="Checking in…"
                      onClick={() => checkIn(current)}
                    >
                      Check in
                    </Button>
                  )}
                  <p className="mt-2 text-center text-[11.5px] leading-[1.5] text-ink-3">
                    {current.status === "IN_PROGRESS"
                      ? "Tick off the care plan and check out when you leave."
                      : `Check-in opens shortly before ${formatTime(current.scheduledStart)}.`}
                  </p>

                  <div className="mt-3">
                    <Button
                      size="lg"
                      fullWidth
                      onClick={() => navigate(`/my-visits/${current.id}`)}
                    >
                      Open the care plan
                    </Button>
                  </div>
                </div>
              </article>
            </>
          )}

          {later.length > 0 && (
            <>
              <SectionRule label="Later today" />
              {later.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => navigate(`/my-visits/${visit.id}`)}
                  className="mb-2.5 flex w-full cursor-pointer items-center gap-3.5 rounded-[10px] border border-line-2 bg-panel p-3.5 text-left hover:border-line-3"
                >
                  <span className="w-[58px] shrink-0">
                    <span className="block text-[15px] leading-[1.2] font-bold text-ink">
                      {formatTime(visit.scheduledStart)}
                    </span>
                    <span className="block text-[11.5px] leading-[1.3] text-ink-3">
                      {formatDuration(visit.scheduledStart, visit.scheduledEnd)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 border-l border-line pl-3.5">
                    <span className="block truncate text-[15px] leading-[1.25] font-semibold text-ink">
                      {visit.client.firstName} {visit.client.lastName}
                    </span>
                    <span className="block truncate text-[12.5px] leading-[1.4] text-ink-2">
                      {visit.client.city}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-[3px] border border-line bg-sunken px-1.5 py-1 font-mono text-[9.5px] leading-none font-bold text-ink-3">
                    {SKILL_LABELS[visit.requiredSkill].slice(0, 4).toUpperCase()}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionRule({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 pt-3.5 pb-2.5">
      <span
        className={cn("label-caps text-[9.5px]", accent ? "text-pine-acc" : "text-ink-4")}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cn("h-px flex-1", accent ? "bg-pine-line" : "bg-line")}
      />
    </div>
  );
}

function DaySkeleton() {
  return (
    <div role="status" aria-label="Loading your day" className="flex flex-col gap-3">
      <Skeleton lead className="h-[11px] w-[120px]" />
      <Skeleton className="h-[62px] rounded-[9px]" />
      <Skeleton className="h-[62px] rounded-[9px]" />
      <Skeleton className="h-[210px] rounded-[12px]" />
      <Skeleton className="h-[70px] rounded-[10px]" />
    </div>
  );
}
