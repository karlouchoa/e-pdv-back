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

    let requestTenant = req?.tenant?.slug?.trim();

    // Em clientes que nao enviam o header x-tenant (ex.: frontend B),
    // alinhamos o tenant da requisicao com o do token para evitar 401.
    if (!requestTenant && tokenTenant) {
      req.tenant = { ...(req.tenant ?? {}), slug: tokenTenant };
      requestTenant = tokenTenant;
    }

    if (!requestTenant) {
      throw new BadRequestException('Tenant nao identificado na requisicao.');
    }

    if (requestTenant.toLowerCase() !== tokenTenant.toLowerCase()) {
      throw new ForbiddenException(
        'Tenant do token nao corresponde ao tenant da requisicao.',
      );
    }

    return true;
  }
}
