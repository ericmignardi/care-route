import type { DayOfWeek, Skill, VisitStatus } from "../lib/constants";

/**
 * The wire shapes returned by the backend. `LocalDateTime` fields arrive as unzoned ISO
 * strings and `Instant` fields as UTC — a scheduled window is a wall-clock fact, a check-in
 * stamp is a moment in time. `lib/dates` resolves that; nothing else should parse.
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
 * BR-1 through BR-3, as the server evaluated them. The server has already sorted `reasons`
 * by rule priority, so `reasons[0]` is the one worth showing when there is room for one.
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

export const ELIGIBILITY_RULE_TAGS: Record<EligibilityRule, string> = {
  CAREGIVER_INACTIVE: "INACTIVE",
  CAREGIVER_MISSING_SKILL: "QUALIFICATION",
  CAREGIVER_UNAVAILABLE: "AVAILABILITY",
  CAREGIVER_DOUBLE_BOOKED: "BOOKED",
};
