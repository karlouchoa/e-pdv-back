import { Module } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { TItensComboController } from './t_itenscombo.controller';
import { TItensComboService } from './t_itenscombo.service';

@Module({
  controllers: [TItensComboController],
  providers: [TItensComboService, TenantDbService],
})
export class TItensComboModule {}
