import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from './types/jwt-payload.type';
import { ROLES_KEY, type RoleName } from './decorators/roles.decorator';

type RoleCarrier = JwtPayload & {
  role?: string | null;
  roles?: string[] | null;
  perfil?: string | null;
  perfis?: string[] | null;
};

const normalizeRole = (value: string) => value.trim().toUpperCase();

const extractRoles = (user: RoleCarrier): string[] => {
  const roles: string[] = [];

  if (user.role) {
    roles.push(user.role);
  }

  if (Array.isArray(user.roles)) {
    roles.push(...user.roles);
  }

  if (user.perfil) {
    roles.push(user.perfil);
  }

  if (Array.isArray(user.perfis)) {
    roles.push(...user.perfis);
  }

  return roles.map(normalizeRole).filter((role) => role.length > 0);
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RoleCarrier }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario nao autenticado.');
    }

    if (user.admin) {
      return true;
    }

    const normalizedRequired = requiredRoles.map(normalizeRole);
    const userRoles = extractRoles(user);

    const allowed = userRoles.some((role) => normalizedRequired.includes(role));
    if (!allowed) {
      throw new ForbiddenException('Usuario sem permissao para esta rota.');
    }

    return true;
  }
}
