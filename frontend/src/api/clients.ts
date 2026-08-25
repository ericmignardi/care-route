import { api } from "./client";
import type { PageResponse } from "../types/api";
import type {
  CarePlanTask,
  Client,
  ClientDetail,
  ClientRequest,
  ClientStatus,
} from "../types/domain";

export interface ClientQuery {
  search?: string;
  status?: ClientStatus | "";
  page?: number;
  size?: number;
}

/**
 * Blank filters are dropped rather than sent empty: `?status=` binds to an empty string
 * on the server and fails enum conversion with a 400, which is a confusing way to say
 * "no filter".
 */
function clientParams(query: ClientQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page ?? 0,
    size: query.size ?? 20,
  };
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.status) params.status = query.status;
  return params;
}

export const clientsApi = {
  async list(query: ClientQuery = {}): Promise<PageResponse<Client>> {
    const { data } = await api.get<PageResponse<Client>>("/clients", {
      params: clientParams(query),
    });
    return data;
  },

  async get(id: string): Promise<ClientDetail> {
    const { data } = await api.get<ClientDetail>(`/clients/${id}`);
    return data;
  },

  async create(request: ClientRequest): Promise<Client> {
    const { data } = await api.post<Client>("/clients", request);
    return data;
  },

  async update(id: string, request: ClientRequest): Promise<Client> {
    const { data } = await api.put<Client>(`/clients/${id}`, request);
    return data;
  },

  /** Deactivates. A client row is referenced by every visit ever performed for them. */
  async deactivate(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async addCarePlanTask(
    id: string,
    task: { description: string; sortOrder?: number },
  ): Promise<CarePlanTask> {
    const { data } = await api.post<CarePlanTask>(`/clients/${id}/care-plan-tasks`, task);
    return data;
  },

  async removeCarePlanTask(id: string, taskId: string): Promise<void> {
    await api.delete(`/clients/${id}/care-plan-tasks/${taskId}`);
  },
};
