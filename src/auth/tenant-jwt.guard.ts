import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

type TenantRequest = {
  user?: { tenant?: string; tenantSlug?: string };
  tenant?: { slug?: string };
  headers?: { 'x-tenant'?: string | string[] };
};

@Injectable()
export class TenantJwtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) {
      return false;
    }

    const req = context.switchToHttp().getRequest<TenantRequest>();

    const tokenTenant =
      req?.user?.tenant?.trim() ?? req?.user?.tenantSlug?.trim();
    if (!tokenTenant) {
      throw new BadRequestException('Tenant nao encontrado no token JWT.');
    }

    const rawHeaderTenant = req?.headers?.['x-tenant'];
    const headerTenant = Array.isArray(rawHeaderTenant)
      ? rawHeaderTenant[0]?.trim()
      : rawHeaderTenant?.trim();

    if (
      headerTenant &&
      headerTenant.toLowerCase() !== tokenTenant.toLowerCase()
    ) {
      throw new ForbiddenException('Tenant do header nao corresponde ao token.');
    }

    // For protected routes, tenant source of truth is always the token.
    req.tenant = { ...(req.tenant ?? {}), slug: tokenTenant };

    return true;
  }
}
