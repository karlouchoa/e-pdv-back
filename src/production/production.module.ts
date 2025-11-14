import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { BomPdfService } from './bom-pdf.service';

@Module({
  controllers: [ProductionController],
  providers: [ProductionService, TenantDbService, BomPdfService],
})
export class ProductionModule {}
