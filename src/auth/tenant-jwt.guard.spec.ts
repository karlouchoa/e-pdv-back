import {
  BadRequestException,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantJwtGuard } from './tenant-jwt.guard';

describe('TenantJwtGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
  });

  it('uses tenant from token when available', async () => {
    const guard = new TenantJwtGuard(reflector);
    jest
      .spyOn(
        Object.getPrototypeOf(TenantJwtGuard.prototype),
        'canActivate',
      )
      .mockResolvedValue(true);

    const request = {
      user: { tenant: 'barataododia' },
      headers: { 'x-tenant': 'barataododia' },
    };

    const allowed = await guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toMatchObject({
      tenant: 'barataododia',
      tenantSlug: 'barataododia',
      banco: 'barataododia',
    });
  });

  it('falls back to x-tenant for legacy tokens without tenant payload', async () => {
    const guard = new TenantJwtGuard(reflector);
    jest
      .spyOn(
        Object.getPrototypeOf(TenantJwtGuard.prototype),
        'canActivate',
      )
      .mockResolvedValue(true);

    const request = {
      user: { sub: 'USR001' },
      headers: { 'x-tenant': 'barataododia' },
    };

    const allowed = await guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toMatchObject({
      tenant: 'barataododia',
      tenantSlug: 'barataododia',
      banco: 'barataododia',
    });
  });

  it('rejects when token tenant and header tenant diverge', async () => {
    const guard = new TenantJwtGuard(reflector);
    jest
      .spyOn(
        Object.getPrototypeOf(TenantJwtGuard.prototype),
        'canActivate',
      )
      .mockResolvedValue(true);

    const request = {
      user: { tenant: 'tenant-a' },
      headers: { 'x-tenant': 'tenant-b' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when tenant is absent from both token and header', async () => {
    const guard = new TenantJwtGuard(reflector);
    jest
      .spyOn(
        Object.getPrototypeOf(TenantJwtGuard.prototype),
        'canActivate',
      )
      .mockResolvedValue(true);

    const request = {
      user: { sub: 'USR001' },
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
