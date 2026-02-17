import { Module } from '@nestjs/common';
import {
  CompanyConfigLookupController,
  StoreHoursController,
} from './company-config.controller';
import { CompanyConfigService } from './company-config.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [CompanyConfigLookupController, StoreHoursController],
  providers: [CompanyConfigService, TenantDbService],
})
export class CompanyConfigModule {}
