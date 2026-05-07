export interface Role {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  createdAt: string;
  lastLoginAt: string | null;
  organizationId: number | null;
  roles: Role[];
}

export interface UserDetail extends User {
  updatedAt: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName?: string;
  roleIds?: number[];
}

export interface UpdateUserPayload {
  fullName?: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
