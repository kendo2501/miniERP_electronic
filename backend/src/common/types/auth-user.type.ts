export interface AuthUser {
  id: number;
  email: string;
  organizationId: number | null;
  sessionDbId: number;
  sessionIdentifier: string;
  roles: string[];
  permissions: string[];
  linkedCustomerId?: number | null;
}
