import { api } from "./client";
import type { PageResponse } from "../types/api";
import type {
  Availability,
  AvailabilityInput,
  Caregiver,
  CaregiverDetail,
  CaregiverStatus,
  CreateCaregiverRequest,
  UpdateCaregiverRequest,
} from "../types/domain";

export interface CaregiverQuery {
  search?: string;
  status?: CaregiverStatus | "";
  page?: number;
  size?: number;
}

function caregiverParams(query: CaregiverQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page ?? 0,
    size: query.size ?? 20,
  };
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.status) params.status = query.status;
  return params;
}

export const caregiversApi = {
  async list(query: CaregiverQuery = {}): Promise<PageResponse<Caregiver>> {
    const { data } = await api.get<PageResponse<Caregiver>>("/caregivers", {
      params: caregiverParams(query),
    });
    return data;
  },

  async get(id: string): Promise<CaregiverDetail> {
    const { data } = await api.get<CaregiverDetail>(`/caregivers/${id}`);
    return data;
  },

  /** Creates the login and the profile together — neither is useful alone (FR-1.4). */
  async create(request: CreateCaregiverRequest): Promise<CaregiverDetail> {
    const { data } = await api.post<CaregiverDetail>("/caregivers", request);
    return data;
  },

  async update(id: string, request: UpdateCaregiverRequest): Promise<CaregiverDetail> {
    const { data } = await api.put<CaregiverDetail>(`/caregivers/${id}`, request);
    return data;
  },

  /** A whole-week replace, not a per-row patch — the only way to delete a window. */
  async replaceAvailability(id: string, windows: AvailabilityInput[]): Promise<Availability[]> {
    const { data } = await api.put<Availability[]>(`/caregivers/${id}/availability`, { windows });
    return data;
  },
};
