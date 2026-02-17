import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PublicClientLookupDto } from './dto/public-client-lookup.dto';
import { UpsertPublicClientDto } from './dto/upsert-public-client.dto';
import { PublicCustomersService } from './public-customers.service';
import { resolveTenantFromRequest } from './tenant-resolver';

@Controller('t_cli')
export class PublicCustomersController {
  constructor(
    private readonly publicCustomersService: PublicCustomersService,
  ) {}

  @Public()
  @Post('public/lookup')
  findByPhone(@Req() req: Request, @Body() dto: PublicClientLookupDto) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicCustomersService.findByPhone(tenant, dto);
  }

  @Public()
  @Post('public/upsert')
  upsert(@Req() req: Request, @Body() dto: UpsertPublicClientDto) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicCustomersService.upsertPublicClient(tenant, dto);
  }
}
