import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { BomPdfService } from './bom-pdf.service';
import { InventoryService } from '../inventory/inventory.service';
import { TFormulasService } from '../t_formulas/t_formulas.service';

@Module({
  controllers: [ProductionController],
  providers: [
    ProductionService,
    TenantDbService,
    BomPdfService,
    InventoryService,
    TFormulasService,
  ],
})
export class ProductionModule {}
