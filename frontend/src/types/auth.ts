export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  organizationId: number | null;
  linkedCustomerId?: number | null;
  roles: string[];
  permissions: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}
