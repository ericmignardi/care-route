import { api } from "./client";
import type { PageResponse } from "../types/api";
import type { Skill, VisitStatus } from "../lib/constants";
import type {
  CaregiverEligibility,
  ScheduleVisitRequest,
  Visit,
  VisitDetail,
} from "../types/domain";

export interface VisitQuery {
  /** Unzoned local ISO, e.g. "2026-08-25T00:00:00" — the server parses it as wall clock. */
  from?: string;
  to?: string;
  caregiverId?: string;
  clientId?: string;
  status?: VisitStatus | "";
  page?: number;
  size?: number;
}

function visitParams(query: VisitQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page ?? 0,
    size: query.size ?? 20,
  };
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  if (query.caregiverId) params.caregiverId = query.caregiverId;
  if (query.clientId) params.clientId = query.clientId;
  if (query.status) params.status = query.status;
  return params;
}

export const visitsApi = {
  async list(query: VisitQuery = {}): Promise<PageResponse<Visit>> {
    const { data } = await api.get<PageResponse<Visit>>("/visits", { params: visitParams(query) });
    return data;
  },

  async get(id: string): Promise<VisitDetail> {
    const { data } = await api.get<VisitDetail>(`/visits/${id}`);
    return data;
  },

  async schedule(request: ScheduleVisitRequest): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>("/visits", request);
    return data;
  },

  /**
   * Every caregiver comes back, eligible or not, each ineligible one carrying its reasons.
   * Pass `visitId` when reassigning so the visit does not conflict with itself.
   */
  async eligibleCaregivers(params: {
    start: string;
    end: string;
    requiredSkill?: Skill;
    visitId?: string;
  }): Promise<CaregiverEligibility[]> {
    const { data } = await api.get<CaregiverEligibility[]>("/visits/eligible-caregivers", {
      params,
    });
    return data;
  },

  async myVisits(date?: string): Promise<Visit[]> {
    const { data } = await api.get<Visit[]>("/visits/my", { params: date ? { date } : {} });
    return data;
  },

  async assign(id: string, caregiverId: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/assign`, { caregiverId });
    return data;
  },

  async cancel(id: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/cancel`);
    return data;
  },

  async checkIn(id: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/check-in`);
    return data;
  },

  async checkOut(id: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/check-out`);
    return data;
  },

  async completeTask(id: string, taskId: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/tasks/${taskId}/complete`);
    return data;
  },

  async addNote(id: string, notes: string): Promise<VisitDetail> {
    const { data } = await api.post<VisitDetail>(`/visits/${id}/notes`, { notes });
    return data;
  },
};
