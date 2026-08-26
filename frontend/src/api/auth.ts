import { api } from "./client";
import type { CurrentUser, LoginInput, RegisterInput } from "../types/auth";

export const authApi = {
  /** Sets the httpOnly JWT cookie as a side effect; the token in the body is unused. */
  async login(input: LoginInput): Promise<void> {
    await api.post("/auth/login", {
      username: input.username,
      password: input.password,
    });
  },

  /** Always yields a caregiver account — the backend rejects any privileged role. */
  async register(input: RegisterInput): Promise<void> {
    await api.post("/auth/register", {
      username: input.username,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async me(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>("/auth/me");
    return data;
  },
};
