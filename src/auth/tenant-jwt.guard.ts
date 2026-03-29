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
  user?: { tenant?: string; tenantSlug?: string; banco?: string };
  tenant?: { slug?: string };
  headers?: { 'x-tenant'?: string | string[] };
};

const normalizeTenantValue = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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
      normalizeTenantValue(req?.user?.tenant) ??
      normalizeTenantValue(req?.user?.tenantSlug) ??
      normalizeTenantValue(req?.user?.banco);

    const rawHeaderTenant = req?.headers?.['x-tenant'];
    const headerTenant = normalizeTenantValue(
      Array.isArray(rawHeaderTenant) ? rawHeaderTenant[0] : rawHeaderTenant,
    );

    const resolvedTenant = tokenTenant ?? headerTenant;
    if (!resolvedTenant) {
      throw new BadRequestException('Tenant nao encontrado no token JWT.');
    }

    if (
      tokenTenant &&
      headerTenant &&
      headerTenant.toLowerCase() !== tokenTenant.toLowerCase()
    ) {
      throw new ForbiddenException(
        'Tenant do header nao corresponde ao token.',
      );
    }

    // For protected routes, tenant source of truth is always the token.
    req.user = {
      ...(req.user ?? {}),
      tenant: resolvedTenant,
      tenantSlug: resolvedTenant,
      banco: resolvedTenant,
    };
    req.tenant = { ...(req.tenant ?? {}), slug: resolvedTenant };

    return true;
  }
}
