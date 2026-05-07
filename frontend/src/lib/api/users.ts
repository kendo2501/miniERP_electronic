import { apiClient } from "./client";
import type {
  User,
  UserDetail,
  UserListResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UserQueryParams,
} from "@/types/user";

export const usersApi = {
  list: (params?: UserQueryParams) =>
    apiClient.get<UserListResponse>("/users", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<UserDetail>(`/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    apiClient.post<User>("/users", payload).then((r) => r.data),

  update: (id: number, payload: UpdateUserPayload) =>
    apiClient.patch<User>(`/users/${id}`, payload).then((r) => r.data),

  lock: (id: number) =>
    apiClient.post<{ id: number; status: string }>(`/users/${id}/lock`).then((r) => r.data),

  unlock: (id: number) =>
    apiClient.post<{ id: number; status: string }>(`/users/${id}/unlock`).then((r) => r.data),

  assignRoles: (id: number, roleIds: number[]) =>
    apiClient.put<UserDetail>(`/users/${id}/roles`, { roleIds }).then((r) => r.data),
};
