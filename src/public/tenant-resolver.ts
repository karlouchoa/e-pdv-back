import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

export function resolveTenantFromRequest(req: Request) {
  const headerTenant = req.headers['x-tenant'];

  if (typeof headerTenant === 'string' && headerTenant.trim().length > 0) {
    return headerTenant.trim();
  }

  const host = req.headers.host;
  const hostWithoutPort = host?.split(':')[0];
  const subdomain = hostWithoutPort?.split('.')[0];

  if (!subdomain || subdomain === 'www') {
    throw new NotFoundException('Estabelecimento nao identificado.');
  }

  return subdomain;
}
