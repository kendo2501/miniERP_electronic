export interface JwtPayload {
  sub: number;
  sid: string;
  email: string;
  iat?: number;
  exp?: number;
}
