import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePublicItsvenDto } from './dto/create-public-itsven.dto';
import { PublicOrdersService } from './public-orders.service';
import { resolveTenantFromRequest } from './tenant-resolver';

@Controller('t_itsven')
export class PublicItsvenController {
  constructor(private readonly publicOrdersService: PublicOrdersService) {}

  @Post('public')
  create(@Req() req: Request, @Body() dto: CreatePublicItsvenDto) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicOrdersService.createItsven(tenant, dto);
  }
}
