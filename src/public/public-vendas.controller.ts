import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicVendaComItensDto } from './dto/create-public-venda-com-itens.dto';
import { CreatePublicVendaDto } from './dto/create-public-venda.dto';
import { PublicOrdersService } from './public-orders.service';
import { resolvePublicSubdomainFromRequest } from './tenant-resolver';

@Public()
@Controller('t_vendas')
export class PublicVendasController {
  constructor(private readonly publicOrdersService: PublicOrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('public')
  create(@Req() req: Request, @Body() dto: CreatePublicVendaDto) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicOrdersService.createVenda(tenant, dto);
  }

  @Get('public/:id')
  getPublicOrder(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicOrdersService.getPublicOrder(tenant, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('public/completo')
  createWithItens(
    @Req() req: Request,
    @Body() dto: CreatePublicVendaComItensDto,
  ) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicOrdersService.createVendaComItens(
      tenant,
      dto.venda,
      dto.itens,
    );
  }
}
