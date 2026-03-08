import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { PublicTenantProvisionService } from './public-tenant-provision.service';

@Public()
@Controller('public/tenant')
export class PublicTenantProvisionController {
  constructor(
    private readonly publicTenantProvisionService: PublicTenantProvisionService,
  ) {}

  @Post('provision')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  provision(
    @Body() dto: ProvisionTenantDto,
    @Headers('x-provision-key') provisionKey?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.publicTenantProvisionService.provision(dto, {
      provisionKey,
      correlationId,
    });
  }
}
