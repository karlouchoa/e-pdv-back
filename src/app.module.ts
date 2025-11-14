import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TItensModule } from './t_itens/t_itens.module';
import { TFormulasModule } from './t_formulas/t_formulas.module';
import { TenantTablesModule } from './tenant-tables/tenant-tables.module';
import { ProductionModule } from './production/production.module';

@Module({
  imports: [
    AuthModule,
    TItensModule,
    TFormulasModule,
    TenantTablesModule,
    ProductionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
