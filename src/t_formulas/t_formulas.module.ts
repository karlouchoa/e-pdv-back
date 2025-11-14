import { Module } from '@nestjs/common';
import { TFormulasService } from './t_formulas.service';
import { TFormulasController } from './t_formulas.controller';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Module({
  controllers: [TFormulasController],
  providers: [TFormulasService, TenantDbService],
})
export class TFormulasModule {}
