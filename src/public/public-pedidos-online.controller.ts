import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
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

  @Public()
  @Get('public/cliente/:idCliente')
  listByClient(
    @Req() req: Request,
    @Param('idCliente', new ParseUUIDPipe()) idCliente: string,
    @Query('limit') limitRaw?: string,
  ) {
    const tenant = resolveTenantFromRequest(req);
    const parsedLimit = Number(limitRaw);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;

    return this.publicPedidosOnlineService.listPedidosByCliente(tenant, {
      idCliente,
      limit,
    });
  }

  @Public()
  @Get('public/:id')
  findById(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicPedidosOnlineService.getPedidoPublic(tenant, id);
  }
}
