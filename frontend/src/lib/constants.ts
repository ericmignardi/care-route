/**
 * Enum values mirrored from the backend. These are wire values, so they are transcribed
 * rather than derived — a rename on either side should break the build here.
 */
export const ROLES = ["ROLE_ADMIN", "ROLE_COORDINATOR", "ROLE_CAREGIVER"] as const;
export type Role = (typeof ROLES)[number];

export const COORDINATOR_ROLES: Role[] = ["ROLE_COORDINATOR", "ROLE_ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  ROLE_ADMIN: "Administrator",
  ROLE_COORDINATOR: "Coordinator",
  ROLE_CAREGIVER: "Caregiver",
};

export const SKILLS = ["PERSONAL_SUPPORT", "NURSING", "MEDICATION", "MOBILITY", "RESPITE"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  PERSONAL_SUPPORT: "Personal support",
  NURSING: "Nursing",
  MEDICATION: "Medication",
  MOBILITY: "Mobility",
  RESPITE: "Respite",
};

export const VISIT_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

/**
 * Status is never carried by hue alone. Every rendering pairs the colour with a glyph
 * and a word, because some coordinators are colour-blind and all of them scan these
 * hundreds of times a day.
 */
export const VISIT_STATUS_META: Record<
  VisitStatus,
  { label: string; short: string; glyph: string; tone: "sch" | "prg" | "don" | "can" | "mis" }
> = {
  SCHEDULED: { label: "Scheduled", short: "SCHED", glyph: "\u25CB", tone: "sch" },
  IN_PROGRESS: { label: "In progress", short: "LIVE", glyph: "\u25CF", tone: "prg" },
  COMPLETED: { label: "Completed", short: "DONE", glyph: "\u2713", tone: "don" },
  CANCELLED: { label: "Cancelled", short: "CANC", glyph: "\u2014", tone: "can" },
  MISSED: { label: "Missed", short: "MISSED", glyph: "\u25C6", tone: "mis" },
};

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const THEME_STORAGE_KEY = "careroute.theme";
