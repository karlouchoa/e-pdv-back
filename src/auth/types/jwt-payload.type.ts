export interface JwtPayload {
  sub: string;
  tenant: string;
  tenantSlug?: string;
  banco?: string;
  email?: string | null;
  name?: string | null;
  admin?: boolean;
  iat?: number;
  exp?: number;
}
