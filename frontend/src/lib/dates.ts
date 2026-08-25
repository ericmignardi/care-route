import {
  addDays,
  format,
  formatDistanceStrict,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";

/**
 * A 24-hour clock throughout, per the design brief. Times are formatted once, here, so
 * the schedule grid and the caregiver day view cannot disagree about what 14:30 looks like.
 */
export const TIME = "HH:mm";
export const DAY = "EEE d MMM yyyy";
export const DAY_LONG = "EEEE d MMM";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), TIME);
}

export function formatDay(value: string | Date): string {
  return format(toDate(value), DAY);
}

export function formatDayLong(value: string | Date): string {
  return format(toDate(value), DAY_LONG);
}

/** "Mon 24" — the week chart's axis, where the month is already in the caption. */
export function formatDayTick(value: string | Date): string {
  return format(toDate(value), "EEE d");
}

/** "Mon 24 Aug" — the week chart's caption, which does need the month. */
export function formatDayMedium(value: string | Date): string {
  return format(toDate(value), "EEE d MMM");
}

/** "09:00–10:30", collapsing the date when both ends fall on the same day. */
export function formatWindow(start: string | Date, end: string | Date): string {
  const from = toDate(start);
  const to = toDate(end);
  return isSameDay(from, to)
    ? `${format(from, TIME)}\u2013${format(to, TIME)}`
    : `${format(from, `${DAY} ${TIME}`)} \u2013 ${format(to, `${DAY} ${TIME}`)}`;
}

/** "1 h 26" — how long a caregiver was actually on site. */
export function formatDuration(start: string | Date, end: string | Date): string {
  const minutes = Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60000);
  if (minutes < 60) return `${minutes} m`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export function formatRelative(value: string | Date, from: Date = new Date()): string {
  return formatDistanceStrict(toDate(value), from, { addSuffix: true });
}

/** The `yyyy-MM-dd` form the visit filters and date navigation use in the query string. */
export function toDateParam(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

/**
 * The unzoned local ISO the backend's `LocalDateTime` parameters expect. `toISOString()`
 * would be wrong here: it converts to UTC, so an 08:00 Ancaster window becomes 12:00 or
 * 13:00 depending on daylight saving, and the day filter silently returns the wrong day.
 */
export function toLocalIso(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm:ss");
}

/** The half-open day the schedule board asks for: [00:00 of the day, 00:00 of the next). */
export function dayBounds(day: Date): { from: string; to: string } {
  return {
    from: toLocalIso(startOfDay(day)),
    to: toLocalIso(startOfDay(addDays(day, 1))),
  };
}

/** Minutes since midnight — the schedule board's unit for placing a block. */
export function minutesOfDay(value: string | Date): number {
  const date = toDate(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function durationMinutes(start: string | Date, end: string | Date): number {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60000);
}

/** Parses `yyyy-MM-dd` from the URL back into a local Date, or today when it is absent. */
export function fromDateParam(value: string | null | undefined): Date {
  if (!value) return startOfDay(new Date());
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

/** "starts in 10 min" / "1 h 50 m late" — the urgency the unassigned worklist sorts by. */
export function formatCountdown(target: string | Date, now: Date = new Date()): string {
  const minutes = Math.round((toDate(target).getTime() - now.getTime()) / 60000);
  const magnitude = Math.abs(minutes);
  const span =
    magnitude < 60
      ? `${magnitude} min`
      : `${Math.floor(magnitude / 60)} h ${String(magnitude % 60).padStart(2, "0")} m`;
  if (minutes < 0) return `${span} late`;
  return span;
}

export { isToday, startOfDay, addDays };
