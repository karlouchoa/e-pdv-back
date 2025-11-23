import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, TenantDbService],
})
export class InventoryModule {}
