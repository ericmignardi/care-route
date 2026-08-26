import {
  addDays,
  format,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";

/** A 24-hour clock throughout. Formatted once, here, so no two views can disagree. */
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

export function formatDayTick(value: string | Date): string {
  return format(toDate(value), "EEE d");
}

export function formatDayMedium(value: string | Date): string {
  return format(toDate(value), "EEE d MMM");
}

export function formatDuration(start: string | Date, end: string | Date): string {
  const minutes = Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60000);
  if (minutes < 60) return `${minutes} m`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export function toDateParam(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

/**
 * The unzoned local ISO the backend's `LocalDateTime` parameters expect. `toISOString()`
 * would convert to UTC, so an 08:00 window becomes 12:00 or 13:00 depending on daylight
 * saving and the day filter silently returns the wrong day.
 */
export function toLocalIso(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm:ss");
}

export function dayBounds(day: Date): { from: string; to: string } {
  return {
    from: toLocalIso(startOfDay(day)),
    to: toLocalIso(startOfDay(addDays(day, 1))),
  };
}

export function minutesOfDay(value: string | Date): number {
  const date = toDate(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function fromDateParam(value: string | null | undefined): Date {
  if (!value) return startOfDay(new Date());
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

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
