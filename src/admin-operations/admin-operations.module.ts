import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';

@Module({
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService, TenantDbService, RolesGuard],
})
export class AdminOperationsModule {}
