import { format, formatDistanceStrict, isSameDay, parseISO } from "date-fns";

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
