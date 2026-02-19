import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { PedidosOnlineConfirmService } from './pedidos-online-confirm.service';
import { PedidosOnlineQueryService } from './pedidos-online-query.service';

type TenantRequest = Request & {
  user?: JwtPayload;
  tenant?: { slug?: string };
};

@Controller(['admin/pedidos-online', 'admin/pedidos'])
@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class AdminPedidosOnlineController {
  constructor(
    private readonly pedidosOnlineConfirmService: PedidosOnlineConfirmService,
    private readonly pedidosOnlineQueryService: PedidosOnlineQueryService,
  ) {}

  private getWarehouse(req: TenantRequest): number | null {
    const raw = req.headers?.['x-warehouse'];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!candidate) return null;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  @Get()
  list(
    @Req() req: TenantRequest,
    @Query('status') status?: string,
    @Query('cdemp') cdempRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }

    const parsedCdemp = Number(cdempRaw);
    const parsedLimit = Number(limitRaw);
    const warehouseCdemp = this.getWarehouse(req);
    const cdemp =
      Number.isInteger(parsedCdemp) && parsedCdemp > 0
        ? parsedCdemp
        : warehouseCdemp;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 200)
        : 100;

    return this.pedidosOnlineQueryService.listForAdmin(tenant, {
      status: status ?? null,
      cdemp,
      limit,
    });
  }

  @Get(':id')
  detail(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }

    return this.pedidosOnlineQueryService.getForAdmin(tenant, id);
  }

  @Post(':id/confirmar')
  confirmar(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }

    const userIdentifier = req.user?.sub ?? req.user?.email ?? req.user?.name;

    return this.pedidosOnlineConfirmService.confirmar(
      tenant,
      id,
      userIdentifier,
      this.getWarehouse(req),
    );
  }
}
