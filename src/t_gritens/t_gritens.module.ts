import { Module } from '@nestjs/common';
import { TGritensService } from './t_gritens.service';
import { TGritensController } from './t_gritens.controller';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [TGritensController],
  providers: [TGritensService, TenantDbService],
})
export class TGritensModule {}
