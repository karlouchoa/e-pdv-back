import { Module } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicCustomersController } from './public-customers.controller';
import { PublicCustomersService } from './public-customers.service';
import { PublicFpgtoController } from './public-fpgto.controller';
import { PublicItsvenController } from './public-itsven.controller';
import { PublicOrdersService } from './public-orders.service';
import { PublicPaymentsService } from './public-payments.service';
import { PublicTpgtoController } from './public-tpgto.controller';
import { PublicVendasController } from './public-vendas.controller';

@Module({
  controllers: [
    PublicTpgtoController,
    PublicFpgtoController,
    PublicCustomersController,
    PublicVendasController,
    PublicItsvenController,
  ],
  providers: [
    PublicPaymentsService,
    PublicCustomersService,
    PublicOrdersService,
    TenantDbService,
  ],
})
export class PublicModule {}
