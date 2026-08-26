import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  BLOCK_HEIGHT,
  blockGeometry,
  boardRange,
  HOUR_WIDTH,
  LABEL_WIDTH,
  nowOffset,
  ROW_HEIGHT,
} from "../../lib/schedule";
import { SKILL_LABELS, VISIT_STATUS_META } from "../../lib/constants";
import { formatTime } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { Caregiver, Visit } from "../../types/domain";

const TONE_VARS: Record<string, { bg: string; bd: string; fg: string }> = {
  sch: { bg: "var(--sch-bg)", bd: "var(--sch-bd)", fg: "var(--sch-fg)" },
  prg: { bg: "var(--prg-bg)", bd: "var(--prg-bd)", fg: "var(--prg-fg)" },
  don: { bg: "var(--don-bg)", bd: "var(--don-bd)", fg: "var(--don-fg)" },
  can: { bg: "var(--can-bg)", bd: "var(--can-bd)", fg: "var(--can-fg)" },
  mis: { bg: "var(--mis-bg)", bd: "var(--mis-bd)", fg: "var(--mis-fg)" },
};

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function shortName(first: string, last: string): string {
  return `${first.charAt(0)}. ${last}`;
}

/**
 * One lane per caregiver, one absolutely-positioned block per visit, and a rail across the
 * top for the unassigned. The rail shares the lanes' hour columns, so an unfilled 09:30
 * visit sits directly above whichever caregiver has a gap at 09:30 — which is why it is a
 * rail and not a sidebar.
 */
export function ScheduleBoard({
  caregivers,
  visits,
  now,
  onOpenVisit,
  onAssign,
}: {
  caregivers: Caregiver[];
  visits: Visit[];
  now: Date | null;
  onOpenVisit: (visit: Visit) => void;
  onAssign: (visit: Visit) => void;
}) {
  const range = useMemo(() => boardRange(visits), [visits]);

  const { assigned, unassigned } = useMemo(() => {
    const byCaregiver = new Map<string, Visit[]>();
    const orphans: Visit[] = [];

    for (const visit of visits) {
      if (!visit.caregiver) {
        orphans.push(visit);
        continue;
      }
      const lane = byCaregiver.get(visit.caregiver.id);
      if (lane) lane.push(visit);
      else byCaregiver.set(visit.caregiver.id, [visit]);
    }

    return { assigned: byCaregiver, unassigned: orphans };
  }, [visits]);

  const marker = now ? nowOffset(range, now) : null;

  return (
    <div className="overflow-hidden rounded-[6px] border border-line-2 bg-bg">
      <div className="overflow-x-auto">
        <div style={{ width: LABEL_WIDTH + range.width }} className="relative">
          <div
            className="flex border-b-2 border-mis-bd bg-mis-bg"
            style={{ minHeight: unassigned.length > 0 ? 76 : 58 }}
          >
            <div
              className="sticky left-0 z-[4] flex shrink-0 flex-col justify-center gap-1 border-r border-mis-bd bg-mis-bg px-3 py-2.5"
              style={{ width: LABEL_WIDTH }}
            >
              <div className="flex items-center gap-[7px]">
                <AlertTriangle aria-hidden="true" className="size-3.5 text-mis-fg" />
                <span className="text-[12px] leading-none font-bold tracking-[.02em] text-mis-fg uppercase">
                  Unassigned
                </span>
                <span className="font-display text-[17px] leading-none text-mis-fg">
                  {unassigned.length}
                </span>
              </div>
              <div className="text-[10.5px] leading-[1.35] text-mis-fg opacity-90">
                {unassigned.length === 0
                  ? "Everything on this day has a caregiver."
                  : "Nobody is coming to these yet. Click one to assign."}
              </div>
            </div>

            <div
              className="relative flex-1"
              style={{
                backgroundImage: `repeating-linear-gradient(to right, var(--mis-bd) 0 1px, transparent 1px ${HOUR_WIDTH}px)`,
              }}
            >
              {unassigned.map((visit) => {
                const geometry = blockGeometry(visit, range);
                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => onAssign(visit)}
                    title={`Assign ${visit.client.firstName} ${visit.client.lastName}, ${formatTime(visit.scheduledStart)}–${formatTime(visit.scheduledEnd)}`}
                    className={cn(
                      "absolute top-3 block cursor-pointer overflow-hidden rounded-[3px] px-2 py-1.5 text-left",
                      "border border-dashed border-l-[3px] border-mis-fg bg-raise",
                      "hover:border-solid hover:bg-panel hover:-translate-y-px",
                      "motion-reduce:hover:translate-y-0",
                    )}
                    style={{ left: geometry.left, width: geometry.width, height: 52 }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="text-[9px] font-bold text-mis-fg">
                        !
                      </span>
                      <span className="truncate text-[11.5px] leading-[1.15] font-bold text-ink">
                        {shortName(visit.client.firstName, visit.client.lastName)}
                      </span>
                    </span>
                    <span className="block truncate text-[10px] leading-[1.4] font-medium text-ink-2">
                      {formatTime(visit.scheduledStart)}&ndash;{formatTime(visit.scheduledEnd)}
                    </span>
                    <span className="block truncate font-mono text-[9.5px] leading-[1.3] font-semibold text-mis-fg">
                      {SKILL_LABELS[visit.requiredSkill].toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex h-[30px] border-b border-line-2 bg-sunken">
            <div
              className="sticky left-0 z-[4] flex shrink-0 items-center justify-between border-r border-line-2 bg-sunken px-3"
              style={{ width: LABEL_WIDTH }}
            >
              <span className="label-caps text-[9.5px] text-ink-3">Caregiver</span>
              <span className="font-mono text-[9.5px] font-semibold text-ink-3">
                {caregivers.length}
              </span>
            </div>
            <div className="flex flex-1">
              {range.hours.map((hour) => (
                <div
                  key={hour}
                  className="shrink-0 border-r border-line pl-[7px] text-[10.5px] leading-[30px] font-semibold text-ink-3 last:border-r-0"
                  style={{ width: HOUR_WIDTH }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {caregivers.map((caregiver) => {
              const lane = assigned.get(caregiver.id) ?? [];
              const bookedMinutes = lane
                .filter((visit) => visit.status !== "CANCELLED")
                .reduce(
                  (total, visit) =>
                    total +
                    (new Date(visit.scheduledEnd).getTime() -
                      new Date(visit.scheduledStart).getTime()) /
                      60000,
                  0,
                );

              return (
                <div key={caregiver.id} className="flex border-b border-line" style={{ height: ROW_HEIGHT }}>
                  <div
                    className="sticky left-0 z-[3] flex shrink-0 items-center gap-2 border-r border-line-2 bg-panel px-3"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-[9px] font-semibold text-ink-2"
                    >
                      {initials(caregiver.firstName, caregiver.lastName)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] leading-[1.2] font-semibold text-ink">
                      {caregiver.firstName} {caregiver.lastName}
                    </span>
                    <span className="shrink-0 rounded-[3px] border border-line bg-sunken px-1 py-[3px] font-mono text-[9px] leading-none font-semibold tracking-[.04em] text-ink-3">
                      {caregiver.skills[0] ? SKILL_LABELS[caregiver.skills[0]].slice(0, 4).toUpperCase() : "—"}
                    </span>
                    <span className="w-[30px] shrink-0 text-right text-[10px] leading-none text-ink-3">
                      {bookedMinutes > 0 ? `${(bookedMinutes / 60).toFixed(1)}h` : "—"}
                    </span>
                  </div>

                  <div
                    className="relative flex-1"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px ${HOUR_WIDTH / 2}px), repeating-linear-gradient(to right, var(--line-2) 0 1px, transparent 1px ${HOUR_WIDTH}px)`,
                    }}
                  >
                    {lane.map((visit) => {
                      const geometry = blockGeometry(visit, range);
                      const meta = VISIT_STATUS_META[visit.status];
                      const tone = TONE_VARS[meta.tone];
                      const cancelled = visit.status === "CANCELLED";

                      return (
                        <button
                          key={visit.id}
                          type="button"
                          onClick={() => onOpenVisit(visit)}
                          title={`${visit.client.firstName} ${visit.client.lastName} · ${formatTime(visit.scheduledStart)}–${formatTime(visit.scheduledEnd)} · ${meta.label}`}
                          className={cn(
                            "absolute top-[5px] cursor-pointer overflow-hidden rounded-[3px] border px-1.5 py-[3px] text-left",
                            "transition-[transform,border-color] duration-100",
                            "hover:z-[6] hover:-translate-y-[1.5px] hover:!border-ink-2",
                            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                            cancelled && "opacity-70",
                          )}
                          style={{
                            left: geometry.left,
                            width: geometry.width,
                            height: BLOCK_HEIGHT,
                            background: tone.bg,
                            borderColor: tone.bd,
                            borderLeft: `3px solid ${tone.bd}`,
                            borderStyle: cancelled ? "dashed" : "solid",
                          }}
                        >
                          <span className="flex items-center gap-1">
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-[9px] leading-none font-bold"
                              style={{ color: tone.fg }}
                            >
                              {meta.glyph}
                            </span>
                            <span
                              className={cn(
                                "truncate text-[11px] leading-[1.2] font-semibold text-ink",
                                cancelled && "line-through",
                              )}
                            >
                              {shortName(visit.client.firstName, visit.client.lastName)}
                            </span>
                          </span>
                          <span
                            className="block truncate text-[10px] leading-[1.4] font-medium"
                            style={{ color: tone.fg }}
                          >
                            {formatTime(visit.scheduledStart)}
                            {geometry.width >= 100 && `–${formatTime(visit.scheduledEnd)}`}
                            {geometry.width >= 140 &&
                              ` · ${SKILL_LABELS[visit.requiredSkill].slice(0, 4).toUpperCase()}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {marker !== null && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 bottom-0 z-[7] w-px bg-prg-bd"
                  style={{ left: LABEL_WIDTH + marker }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 z-[9] rounded-l-[3px] bg-prg-bd px-1.5 py-0.5 font-mono text-[9.5px] leading-[1.4] font-bold text-[#231F19]"
                  style={{ left: LABEL_WIDTH + marker - 59 }}
                >
                  NOW {formatTime(now as Date)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Legend visits={visits} />
    </div>
  );
}

function Legend({ visits }: { visits: Visit[] }) {
  const counts = useMemo(() => {
    const tally = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, MISSED: 0 };
    for (const visit of visits) tally[visit.status] += 1;
    return tally;
  }, [visits]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-2 bg-panel px-[18px] py-2">
      <span className="label-caps text-[9.5px] text-ink-3">Legend</span>
      {(Object.keys(counts) as Array<keyof typeof counts>).map((status) => {
        const meta = VISIT_STATUS_META[status];
        return (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 text-[11px] leading-none font-medium"
            style={{ color: TONE_VARS[meta.tone].fg }}
          >
            <span aria-hidden="true" className="text-[9px]">
              {meta.glyph}
            </span>
            {meta.label} {counts[status]}
          </span>
        );
      })}
    </div>
  );
}
