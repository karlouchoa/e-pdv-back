import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { resolveTenantFromRequest } from './tenant-resolver';
import { PublicPaymentsService } from './public-payments.service';

@Controller('t_fpgto')
export class PublicFpgtoController {
  constructor(private readonly publicPaymentsService: PublicPaymentsService) {}

  @Public()
  @Get('public')
  listOnline(@Req() req: Request) {
    const tenant = resolveTenantFromRequest(req);
    return this.publicPaymentsService.listFpgto(tenant);
  }
}
