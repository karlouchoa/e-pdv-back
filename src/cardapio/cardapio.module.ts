import { Module } from '@nestjs/common';
import { CardapioController } from './cardapio.controller';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [CardapioController],
  providers: [TenantDbService],
})
export class CardapioModule {}