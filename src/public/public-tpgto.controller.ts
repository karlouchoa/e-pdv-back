import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { resolvePublicSubdomainFromRequest } from './tenant-resolver';
import { PublicPaymentsService } from './public-payments.service';

@Public()
@Controller('t_tpgto')
export class PublicTpgtoController {
  constructor(private readonly publicPaymentsService: PublicPaymentsService) {}

  @Get('public')
  listOnline(@Req() req: Request) {
    const tenant = resolvePublicSubdomainFromRequest(req);
    return this.publicPaymentsService.listTpgto(tenant);
  }
}
