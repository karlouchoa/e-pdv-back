import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

const RESERVED_TENANTS = new Set(['www', 'api']);
const PUBLIC_HOSTS = new Set([
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

const firstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  return null;
};

const normalizeHost = (value: string | null) => {
  if (!value) return null;

  const raw = value.split(',')[0]?.trim();
  if (!raw) return null;

  let hostPart = raw;
  try {
    const parsed = new URL(raw.includes('://') ? raw : `http://${raw}`);
    hostPart = parsed.host;
  } catch {
    hostPart = raw.split('/')[0] ?? raw;
  }

  if (hostPart.startsWith('[')) {
    const end = hostPart.indexOf(']');
    const ipv6 = end === -1 ? hostPart : hostPart.slice(0, end + 1);
    return ipv6.toLowerCase();
  }

  return hostPart.split(':')[0]?.toLowerCase() ?? null;
};

const extractTenantFromHost = (host: string | null) => {
  if (!host || PUBLIC_HOSTS.has(host)) {
    return null;
  }

  const hostParts = host.split('.');
  const subdomain = hostParts[0];
  const hasSubdomain = hostParts.length > 1;

  if (
    !subdomain ||
    RESERVED_TENANTS.has(subdomain) ||
    !hasSubdomain
  ) {
    return null;
  }

  return subdomain;
};

export function resolveTenantFromRequest(req: Request): string;
export function resolveTenantFromRequest(
  req: Request,
  options: { optional: true },
): string | null;
export function resolveTenantFromRequest(
  req: Request,
  options?: { optional?: boolean },
): string | null {
  const headerTenant = firstHeaderValue(req.headers['x-tenant']);
  if (headerTenant) {
    const normalized = headerTenant.toLowerCase();
    if (!RESERVED_TENANTS.has(normalized)) {
      return normalized;
    }
  }

  const tenantFromCandidates = [
    firstHeaderValue(req.headers.host),
    firstHeaderValue(req.headers['x-forwarded-host']),
    firstHeaderValue(req.headers.origin),
    firstHeaderValue(req.headers.referer),
  ]
    .map((candidate) => extractTenantFromHost(normalizeHost(candidate)))
    .find((candidate): candidate is string => Boolean(candidate));

  if (tenantFromCandidates) {
    return tenantFromCandidates;
  }

  if (options?.optional) {
    return null;
  }

  throw new NotFoundException('Estabelecimento nao identificado.');
}
