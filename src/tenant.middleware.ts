import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { resolveTenantFromRequest } from './public/tenant-resolver';

type TenantRequest = Request & { tenant?: { slug: string } };

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    const tenant = resolveTenantFromRequest(req, { optional: true });
    if (tenant) {
      req.tenant = { slug: tenant };
    }
    next();
  }
}
