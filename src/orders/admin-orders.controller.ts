import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrdersStatusService } from './orders-status.service';

type TenantRequest = Request & {
  user?: JwtPayload;
  tenant?: { slug?: string };
};

@Controller('admin/orders')
@UseGuards(TenantJwtGuard)
export class AdminOrdersController {
  constructor(private readonly ordersStatusService: OrdersStatusService) {}

  @Patch(':id/status')
  changeStatus(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeOrderStatusDto,
  ) {
    if (!req.user?.admin) {
      throw new ForbiddenException(
        'Apenas administradores podem alterar status.',
      );
    }

    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }

    return this.ordersStatusService.changeStatus(
      tenant,
      id,
      dto.status,
      dto.source,
      dto.note,
      req.user?.sub ?? req.user?.email ?? null,
    );
  }

  @Get(':id/history')
  listHistory(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    if (!req.user?.admin) {
      throw new ForbiddenException(
        'Apenas administradores podem consultar historico.',
      );
    }

    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }

    return this.ordersStatusService.listHistory(tenant, id);
  }
}
