import { apiClient } from "./client";
import type { AuthResponse, LoginPayload, AuthUser } from "@/types/auth";

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login", payload).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout"),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", { refreshToken }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post("/auth/change-password", { currentPassword, newPassword }),

  me: () => apiClient.get<AuthUser>("/users/me").then((r) => r.data),
};
