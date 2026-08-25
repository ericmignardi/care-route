import type { CurrentUser } from "../types/auth";
import type { CaregiverEligibility, DashboardSummary, VisitDetail } from "../types/domain";

export const coordinator: CurrentUser = {
  userId: "u-dana",
  username: "dana.coordinator",
  firstName: "Dana",
  lastName: "Whitcombe",
  roles: ["ROLE_COORDINATOR"],
  caregiverId: null,
};

export const caregiver: CurrentUser = {
  userId: "u-marcus",
  username: "marcus.leblanc",
  firstName: "Marcus",
  lastName: "LeBlanc",
  roles: ["ROLE_CAREGIVER"],
  caregiverId: "cg-marcus",
};

export const visit: VisitDetail = {
  id: "v-1",
  client: { id: "c-1", firstName: "Vikram", lastName: "Sandhu", city: "Hamilton" },
  caregiver: null,
  scheduledStart: "2026-08-25T09:30:00",
  scheduledEnd: "2026-08-25T10:30:00",
  requiredSkill: "NURSING",
  status: "SCHEDULED",
  checkedInAt: null,
  checkedOutAt: null,
  notes: null,
  tasks: [],
  version: 0,
  createdAt: "2026-08-20T09:00:00Z",
  updatedAt: "2026-08-20T09:00:00Z",
};

/**
 * One caregiver of each kind the assign screen has to render: eligible, blocked for a
 * single reason, and blocked for two at once. The third is the one worth having — a
 * caregiver failing several rules is where a naive screen shows only the first.
 */
export const candidates: CaregiverEligibility[] = [
  {
    caregiverId: "cg-marcus",
    firstName: "Marcus",
    lastName: "LeBlanc",
    skills: ["NURSING", "MEDICATION"],
    eligible: true,
    reasons: [],
  },
  {
    caregiverId: "cg-priya",
    firstName: "Priya",
    lastName: "Raman",
    skills: ["PERSONAL_SUPPORT"],
    eligible: false,
    reasons: [{ rule: "CAREGIVER_MISSING_SKILL", message: "Missing: NURSING" }],
  },
  {
    caregiverId: "cg-tom",
    firstName: "Tom",
    lastName: "Alcott",
    skills: ["NURSING"],
    eligible: false,
    reasons: [
      { rule: "CAREGIVER_UNAVAILABLE", message: "Only available Tuesdays 08:00-16:00" },
      { rule: "CAREGIVER_DOUBLE_BOOKED", message: "Booked 09:00-11:00" },
    ],
  },
];

export const summary: DashboardSummary = {
  visitsToday: 8,
  unassignedUpcoming: 1,
  inProgress: 2,
  completionRate: 0.972,
  visitsThisWeek: [
    { date: "2026-08-24", total: 6, completed: 6, unassigned: 0 },
    { date: "2026-08-25", total: 8, completed: 3, unassigned: 1 },
    { date: "2026-08-26", total: 7, completed: 0, unassigned: 2 },
    { date: "2026-08-27", total: 5, completed: 0, unassigned: 0 },
    { date: "2026-08-28", total: 9, completed: 0, unassigned: 3 },
    { date: "2026-08-29", total: 0, completed: 0, unassigned: 0 },
    { date: "2026-08-30", total: 2, completed: 0, unassigned: 0 },
  ],
  unassignedUpcomingVisits: [visit],
};
