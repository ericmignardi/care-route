import type { DayOfWeek, Skill, VisitStatus } from "../lib/constants";

/**
 * The wire shapes returned by the backend, transcribed from the DTO records rather than
 * inferred. `LocalDateTime` fields arrive as unzoned ISO strings ("2026-08-25T11:30:00")
 * and `Instant` fields as UTC ("2026-08-25T15:34:12.481Z") — the distinction matters,
 * because a scheduled window is a wall-clock fact about Ancaster and a check-in stamp is
 * a moment in time. `lib/dates` is where that gets resolved; nothing else should parse.
 */

export type ClientStatus = "ACTIVE" | "INACTIVE";
export type CaregiverStatus = "ACTIVE" | "INACTIVE";

export interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
}

export interface CaregiverSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  addressLine: string;
  city: string;
  postalCode: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanTask {
  id: string;
  description: string;
  sortOrder: number;
}

export interface ClientDetail extends Client {
  carePlanTasks: CarePlanTask[];
}

export interface ClientRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  addressLine: string;
  city: string;
  postalCode: string;
  status?: ClientStatus;
}

export interface Availability {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

/** A window being edited, before it has been saved and given an id. */
export interface AvailabilityInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface Caregiver {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: CaregiverStatus;
  skills: Skill[];
}

export interface CaregiverDetail extends Caregiver {
  availability: Availability[];
}

export interface CreateCaregiverRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  skills: Skill[];
}

export interface UpdateCaregiverRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  status: CaregiverStatus;
  skills: Skill[];
}

export interface Visit {
  id: string;
  client: ClientSummary;
  caregiver: CaregiverSummary | null;
  scheduledStart: string;
  scheduledEnd: string;
  requiredSkill: Skill;
  status: VisitStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export interface VisitTask {
  id: string;
  description: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
}

export interface VisitDetail extends Visit {
  notes: string | null;
  tasks: VisitTask[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleVisitRequest {
  clientId: string;
  caregiverId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  requiredSkill: Skill;
}

/**
 * BR-1 through BR-3, as the server evaluated them. Declaration order in the backend enum
 * is the priority order, and the server has already sorted `reasons` by it — so
 * `reasons[0]` is the thing worth showing when there is only room for one.
 */
export type EligibilityRule =
  | "CAREGIVER_INACTIVE"
  | "CAREGIVER_MISSING_SKILL"
  | "CAREGIVER_UNAVAILABLE"
  | "CAREGIVER_DOUBLE_BOOKED";

export interface EligibilityReason {
  rule: EligibilityRule;
  message: string;
}

export interface CaregiverEligibility {
  caregiverId: string;
  firstName: string;
  lastName: string;
  skills: Skill[];
  eligible: boolean;
  reasons: EligibilityReason[];
}

/**
 * One bar of the dashboard week chart. The two segments the chart stacks are the
 * assigned remainder and the unassigned share, so they sum to the total above the bar
 * rather than being independent measures of it.
 */
export interface DayCount {
  date: string;
  total: number;
  completed: number;
  unassigned: number;
}

export interface DashboardSummary {
  visitsToday: number;
  unassignedUpcoming: number;
  inProgress: number;
  completionRate: number;
  visitsThisWeek: DayCount[];
  unassignedUpcomingVisits: Visit[];
}

/**
 * The short mono tag the assign screen puts in front of every refusal. The design gives
 * the category its own column so the eye can group eleven blocked caregivers at a glance
 * without reading eleven sentences.
 */
export const ELIGIBILITY_RULE_TAGS: Record<EligibilityRule, string> = {
  CAREGIVER_INACTIVE: "INACTIVE",
  CAREGIVER_MISSING_SKILL: "QUALIFICATION",
  CAREGIVER_UNAVAILABLE: "AVAILABILITY",
  CAREGIVER_DOUBLE_BOOKED: "BOOKED",
};
