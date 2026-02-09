import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

export function resolveTenantFromRequest(req: Request): string;
export function resolveTenantFromRequest(
  req: Request,
  options: { optional: true },
): string | null;
export function resolveTenantFromRequest(
  req: Request,
  options?: { optional?: boolean },
): string | null {
  const headerTenant = req.headers['x-tenant'];
  const reservedTenants = new Set(['www', 'api']);

  if (typeof headerTenant === 'string' && headerTenant.trim().length > 0) {
    const trimmed = headerTenant.trim().toLowerCase();
    if (!reservedTenants.has(trimmed)) {
      return trimmed;
    }
  }

  const host = req.headers.host;
  const hostWithoutPort = host?.split(':')[0];
  const normalizedHost = hostWithoutPort?.toLowerCase() ?? '';
  const publicHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'e-pdv',
    'goldpdv',
    'e-pdv.com',
    'goldpdv.com.br',
    'e-pdv.local',
    'goldpdv.local',
    'api',
  ]);

  if (publicHosts.has(normalizedHost)) {
    if (options?.optional) {
      return null;
    }
    throw new NotFoundException('Estabelecimento nao identificado.');
  }

  const hostParts = hostWithoutPort?.split('.') ?? [];
  const subdomain = hostParts[0];
  const hasSubdomain = hostParts.length > 1;

  if (
    !subdomain ||
    subdomain === 'www' ||
    subdomain === 'api' ||
    (!hasSubdomain && options?.optional)
  ) {
    if (options?.optional) {
      return null;
    }
    throw new NotFoundException('Estabelecimento nao identificado.');
  }

  return subdomain;
}
