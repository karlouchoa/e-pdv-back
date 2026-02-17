import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
import { CashierReportsPdfService } from './cashier-reports-pdf.service';

@Module({
  controllers: [AdminOperationsController],
  providers: [
    AdminOperationsService,
    CashierReportsPdfService,
    TenantDbService,
    RolesGuard,
  ],
})
export class AdminOperationsModule {}
