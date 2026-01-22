import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicVendaComItensDto } from './dto/create-public-venda-com-itens.dto';
import { CreatePublicVendaDto } from './dto/create-public-venda.dto';
import { PublicOrdersService } from './public-orders.service';
import { resolveTenantFromRequest } from './tenant-resolver';

@Controller('t_vendas')
export class PublicVendasController {
  constructor(private readonly publicOrdersService: PublicOrdersService) {}

  @Public()
  @Post('public')
  create(@Req() req: Request, @Body() dto: CreatePublicVendaDto) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicOrdersService.createVenda(tenant, dto);
  }

  @Public()
  @Post('public/completo')
  createWithItens(
    @Req() req: Request,
    @Body() dto: CreatePublicVendaComItensDto,
  ) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicOrdersService.createVendaComItens(
      tenant,
      dto.venda,
      dto.itens,
    );
  }
}
