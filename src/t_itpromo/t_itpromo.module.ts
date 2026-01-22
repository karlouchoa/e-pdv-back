import { Module } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { TItpromoController } from './t_itpromo.controller';
import { TItpromoService } from './t_itpromo.service';

@Module({
  controllers: [TItpromoController],
  providers: [TItpromoService, TenantDbService],
})
export class TItpromoModule {}
