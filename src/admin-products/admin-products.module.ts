import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { ProductAController } from './product-a.controller';
import { ProductAService } from './product-a.service';
import { ProductBController } from './product-b.controller';
import { ProductBService } from './product-b.service';
import { ProductCController } from './product-c.controller';
import { ProductCService } from './product-c.service';

@Module({
  controllers: [ProductAController, ProductBController, ProductCController],
  providers: [
    ProductAService,
    ProductBService,
    ProductCService,
    TenantDbService,
    RolesGuard,
  ],
})
export class AdminProductsModule {}
