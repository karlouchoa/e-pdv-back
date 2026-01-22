import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TItensModule } from './t_itens/t_itens.module';
import { TFormulasModule } from './t_formulas/t_formulas.module';
import { TGritensModule } from './t_gritens/t_gritens.module';
import { TItensComboModule } from './t_itenscombo/t_itenscombo.module';
import { TItpromoModule } from './t_itpromo/t_itpromo.module';
import { TenantTablesModule } from './tenant-tables/tenant-tables.module';
import { ProductionModule } from './production/production.module';
import { InventoryModule } from './inventory/inventory.module';
import { LoggerMiddleware } from './logger.middleware';
import { CardapioModule } from './cardapio/cardapio.module';
import { UploadModule } from './upload/upload.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TItensModule,
    TFormulasModule,
    TGritensModule,
    TItensComboModule,
    TItpromoModule,
    TenantTablesModule,
    ProductionModule,
    InventoryModule,
    CardapioModule,
    UploadModule,
    PublicModule,
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
