import { minutesOfDay } from "./dates";

/**
 * Board geometry. 160px per hour is the load-bearing number: it makes a 30-minute visit
 * 80px, the narrowest block that still holds a client name, a start time and a skill.
 */
export const HOUR_WIDTH = 160;
export const ROW_HEIGHT = 46;
export const LABEL_WIDTH = 240;
export const BLOCK_HEIGHT = 36;
export const MIN_BLOCK_WIDTH = 56;

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;

export interface BoardRange {
  startHour: number;
  endHour: number;
  hours: number[];
  width: number;
}

interface Windowed {
  scheduledStart: string;
  scheduledEnd: string;
}

/**
 * The default 07:00-19:00 window is only a floor: a visit at 05:30 must not fall off the
 * left edge, and one running to 21:00 must not be clipped.
 */
export function boardRange(visits: Windowed[]): BoardRange {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const visit of visits) {
    startHour = Math.min(startHour, Math.floor(minutesOfDay(visit.scheduledStart) / 60));
    // A visit ending at 18:01 needs the 19:00 column to exist, so round the end up.
    endHour = Math.max(endHour, Math.ceil(minutesOfDay(visit.scheduledEnd) / 60));
  }

  startHour = Math.max(0, startHour);
  endHour = Math.min(24, Math.max(endHour, startHour + 1));

  return {
    startHour,
    endHour,
    hours: Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
    width: (endHour - startHour) * HOUR_WIDTH,
  };
}

export function blockGeometry(visit: Windowed, range: BoardRange): { left: number; width: number } {
  const originMinutes = range.startHour * 60;
  const start = minutesOfDay(visit.scheduledStart);
  const end = minutesOfDay(visit.scheduledEnd);

  return {
    left: ((start - originMinutes) / 60) * HOUR_WIDTH,
    width: Math.max(((end - start) / 60) * HOUR_WIDTH, MIN_BLOCK_WIDTH),
  };
}

export function nowOffset(range: BoardRange, now: Date): number | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const originMinutes = range.startHour * 60;
  const offset = ((minutes - originMinutes) / 60) * HOUR_WIDTH;
  return offset < 0 || offset > range.width ? null : offset;
}
