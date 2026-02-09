import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicPedidoOnlineDto } from './dto/create-public-pedido-online.dto';
import { PublicPedidosOnlineService } from './public-pedidos-online.service';
import { resolveTenantFromRequest } from './tenant-resolver';

@Controller('t_pedidosonline')
export class PublicPedidosOnlineController {
  constructor(
    private readonly publicPedidosOnlineService: PublicPedidosOnlineService,
  ) {}

  @Public()
  @Post('public')
  create(@Req() req: Request, @Body() dto: CreatePublicPedidoOnlineDto) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicPedidosOnlineService.createPedidoOnline(tenant, dto);
  }
}
