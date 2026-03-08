import { Module } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { TSubgrController } from './t_subgr.controller';
import { TSubgrService } from './t_subgr.service';

@Module({
  controllers: [TSubgrController],
  providers: [TSubgrService, TenantDbService],
})
export class TSubgrModule {}
