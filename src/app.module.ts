import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TItensModule } from './t_itens/t_itens.module';
import { TFormulasModule } from './t_formulas/t_formulas.module';
import { TenantTablesModule } from './tenant-tables/tenant-tables.module';
import { ProductionModule } from './production/production.module';
import { InventoryModule } from './inventory/inventory.module';
import { LoggerMiddleware } from './logger.middleware';

@Module({
  imports: [
    AuthModule,
    TItensModule,
    TFormulasModule,
    TenantTablesModule,
    ProductionModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica o Middleware para TODAS as rotas
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); 
  }
}
