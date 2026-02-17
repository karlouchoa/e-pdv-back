import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicItsvenDto } from './dto/create-public-itsven.dto';
import { PublicOrdersService } from './public-orders.service';
import { resolvePublicSubdomainFromRequest } from './tenant-resolver';

@Public()
@Controller('t_itsven')
export class PublicItsvenController {
  constructor(private readonly publicOrdersService: PublicOrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('public')
  create(@Req() req: Request, @Body() dto: CreatePublicItsvenDto) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicOrdersService.createItsven(tenant, dto);
  }
}
