import { Module } from '@nestjs/common';
import { TItensService } from './t_itens.service';
import { TItensController } from './t_itens.controller';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [TItensController],
  providers: [TItensService, TenantDbService],
})
export class TItensModule {}
