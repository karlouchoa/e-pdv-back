import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PublicClientLookupDto } from './dto/public-client-lookup.dto';
import { UpsertPublicClientDto } from './dto/upsert-public-client.dto';
import { PublicCustomersService } from './public-customers.service';
import { resolvePublicSubdomainFromRequest } from './tenant-resolver';

@Public()
@Controller('t_cli')
export class PublicCustomersController {
  constructor(
    private readonly publicCustomersService: PublicCustomersService,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('public/lookup')
  findByPhone(@Req() req: Request, @Body() dto: PublicClientLookupDto) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicCustomersService.findByPhone(tenant, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('public/upsert')
  upsert(@Req() req: Request, @Body() dto: UpsertPublicClientDto) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicCustomersService.upsertPublicClient(tenant, dto);
  }
}
