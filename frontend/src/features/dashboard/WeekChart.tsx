import { isSameDay, parseISO } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import { formatDayMedium, formatDayTick } from "../../lib/dates";
import { cn } from "../../lib/cn";
import type { DayCount } from "../../types/domain";

/** The plot area, in px. Three gridline bands of 72px, exactly as the design canvas draws it. */
const PLOT_HEIGHT = 216;
const BANDS = 3;

/**
 * Rounded up to something a person would actually print on an axis. Without this the top
 * tick reads 41 or 17 and the reader has to divide to place a bar; with it the axis is
 * always thirds of a round number and the three gridlines land exactly on the labels.
 */
const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

function axisMaximum(highest: number): number {
  const wanted = Math.max(1, highest) / BANDS;
  const step = NICE_STEPS.find((candidate) => candidate >= wanted) ?? Math.ceil(wanted / 1000) * 1000;
  return step * BANDS;
}

/**
 * Visits per day for the current week, assigned against unassigned.
 *
 * Drawn in CSS rather than with a charting library. Seven bars of two segments each does
 * not justify pulling Recharts and its d3 dependencies into the bundle, and the design
 * specifies exact geometry — 52px bars, a 216px plot, 72px gridline bands — which is
 * easier to honour directly than to talk a chart library into.
 *
 * The two segments are the assigned remainder and the unassigned share, so they sum to
 * the number printed above the bar. A stacked chart whose parts do not add up to its own
 * label is worse than no chart: it is quietly wrong rather than absent.
 */
export function WeekChart({ days }: { days: DayCount[] }) {
  const reduceMotion = Boolean(useReducedMotion());
  const today = new Date();

  const highest = days.reduce((max, day) => Math.max(max, day.total), 0);
  const axisMax = axisMaximum(highest);
  const ticks = Array.from({ length: BANDS + 1 }, (_, index) => (axisMax / BANDS) * (BANDS - index));

  const weekOf = days.length > 0 ? formatDayMedium(days[0].date) : "";
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const unassigned = days.reduce((sum, day) => sum + day.unassigned, 0);

  return (
    <figure className="m-0 flex flex-col rounded-[6px] border border-line-2 bg-panel px-5 pt-[18px] pb-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[13px] leading-[1.2] font-semibold text-ink">Visits per day</h2>
          <p className="text-[11.5px] leading-[1.5] text-ink-3">
            Week of {weekOf} &middot; clay is the unassigned share
          </p>
        </div>
        <div className="flex gap-3">
          <Key swatch="bg-pine" label="Assigned" />
          <Key swatch="bg-mis-fg" label="Unassigned" />
        </div>
      </div>

      {/*
        The drawing is hidden from assistive technology: a div of coloured divs says
        nothing useful read aloud. The same numbers follow as a real table, which is both
        the accessible reading of the chart and the one a coordinator can copy out of.
      */}
      <div aria-hidden="true" className="mt-5 flex flex-1 flex-col">
        <div className="flex flex-1 gap-3.5">
          <div className="relative w-[26px] flex-none" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((tick, index) => (
              <span
                key={tick}
                className="absolute right-0 text-[10px] leading-none text-ink-3"
                style={
                  index === BANDS
                    ? { bottom: "-5px" }
                    : { top: `${(PLOT_HEIGHT / BANDS) * index - 6}px` }
                }
              >
                {tick}
              </span>
            ))}
          </div>

          <div
            className="relative min-w-0 flex-1 border-b border-line-2"
            style={{
              height: PLOT_HEIGHT,
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px " +
                PLOT_HEIGHT / BANDS +
                "px)",
            }}
          >
            <div className="absolute inset-0 flex items-end justify-around px-1.5">
              {days.map((day, index) => {
                const isToday = isSameDay(parseISO(day.date), today);

                return (
                  <div key={day.date} className="flex w-[52px] max-w-[13%] flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "leading-none",
                        isToday
                          ? "text-[12px] font-bold text-ink"
                          : "text-[11.5px] font-medium text-ink-2",
                      )}
                    >
                      {day.total}
                    </span>
                    <Segment
                      value={day.unassigned}
                      axisMax={axisMax}
                      delay={index * 0.04}
                      reduceMotion={reduceMotion}
                      swatch="bg-mis-fg"
                    />
                    <Segment
                      value={day.total - day.unassigned}
                      axisMax={axisMax}
                      delay={index * 0.04}
                      reduceMotion={reduceMotion}
                      swatch={isToday ? "bg-pine" : "bg-sch-bd"}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[7px] flex gap-3.5">
          <div className="w-[26px] flex-none" />
          <div className="flex min-w-0 flex-1 justify-around px-1.5">
            {days.map((day) => (
              <span
                key={day.date}
                className={cn(
                  "w-[52px] max-w-[13%] truncate text-center text-[11px] leading-none",
                  isSameDay(parseISO(day.date), today)
                    ? "font-bold text-ink"
                    : "font-medium text-ink-3",
                )}
              >
                {formatDayTick(day.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        Visits per day for the week of {weekOf}: {total} in total, {unassigned} of them still
        unassigned.
      </figcaption>

      <table className="sr-only">
        <caption>Visits per day, week of {weekOf}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Total</th>
            <th scope="col">Assigned</th>
            <th scope="col">Unassigned</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatDayMedium(day.date)}</th>
              <td>{day.total}</td>
              <td>{day.total - day.unassigned}</td>
              <td>{day.unassigned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * One coloured band. It grows from the baseline on first paint, which is the only motion
 * on this screen that carries meaning — bars rising is how a bar chart says "these are
 * quantities". Under prefers-reduced-motion it simply appears at full height.
 */
function Segment({
  value,
  axisMax,
  delay,
  reduceMotion,
  swatch,
}: {
  value: number;
  axisMax: number;
  delay: number;
  reduceMotion: boolean;
  swatch: string;
}) {
  if (value <= 0) return null;

  // A day with one visit still gets a visible sliver rather than a hairline nobody can see.
  const height = Math.max(2, Math.round((value / axisMax) * PLOT_HEIGHT));

  return (
    <motion.span
      className={cn("block w-full", swatch)}
      initial={reduceMotion ? false : { height: 0 }}
      animate={{ height }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

function Key({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[11px] leading-none font-medium text-ink-2">
      <span aria-hidden="true" className={cn("block size-[9px] rounded-[1px]", swatch)} />
      {label}
    </span>
  );
}
