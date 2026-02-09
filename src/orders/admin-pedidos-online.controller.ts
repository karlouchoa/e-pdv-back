import {
  Controller,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { PedidosOnlineConfirmService } from './pedidos-online-confirm.service';

type TenantRequest = Request & {
  user?: JwtPayload;
  tenant?: { slug?: string };
};

@Controller('admin/pedidos-online')
@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class AdminPedidosOnlineController {
  constructor(
    private readonly pedidosOnlineConfirmService: PedidosOnlineConfirmService,
  ) {}

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
    );
  }
}
