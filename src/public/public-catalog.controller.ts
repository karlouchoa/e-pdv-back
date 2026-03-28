import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCatalogService } from './public-catalog.service';
import { resolvePublicSubdomainFromRequest } from './tenant-resolver';

@Public()
@Controller('t_itenscombo')
export class PublicItensComboController {
  constructor(private readonly publicCatalogService: PublicCatalogService) {}

  @Get('public/item/:idItem')
  listByItemId(@Req() req: Request, @Param('idItem') idItem: string) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicCatalogService.listItensComboByItem(tenant, idItem);
  }
}

@Public()
@Controller('itensporcategoria')
export class PublicItensPorCategoriaController {
  constructor(private readonly publicCatalogService: PublicCatalogService) {}

  @Get('public/:cdgruit')
  listByCategory(@Req() req: Request, @Param('cdgruit') cdgruit: string) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicCatalogService.listItensPorCategoria(tenant, cdgruit);
  }
}
