import { Module } from '@nestjs/common';
import { PedidosOnlineComboRepository } from '../orders/pedidos-online-combo.repository';
import { PedidosOnlineItensRepository } from '../orders/pedidos-online-itens.repository';
import { PedidosOnlineRepository } from '../orders/pedidos-online.repository';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicCustomersController } from './public-customers.controller';
import { PublicCustomersService } from './public-customers.service';
import { PublicContactController } from './public-contact.controller';
import { PublicContactService } from './public-contact.service';
import { PublicFpgtoController } from './public-fpgto.controller';
import { PublicItsvenController } from './public-itsven.controller';
import { PublicOrdersService } from './public-orders.service';
import { PublicPaymentsService } from './public-payments.service';
import { PublicPedidosOnlineController } from './public-pedidos-online.controller';
import { PublicPedidosOnlineService } from './public-pedidos-online.service';
import { PublicTpgtoController } from './public-tpgto.controller';
import { PublicVendasController } from './public-vendas.controller';

@Module({
  controllers: [
    PublicTpgtoController,
    PublicFpgtoController,
    PublicCustomersController,
    PublicVendasController,
    PublicItsvenController,
    PublicPedidosOnlineController,
    PublicContactController,
  ],
  providers: [
    PublicPaymentsService,
    PublicCustomersService,
    PublicContactService,
    PublicOrdersService,
    PublicPedidosOnlineService,
    PedidosOnlineRepository,
    PedidosOnlineItensRepository,
    PedidosOnlineComboRepository,
    TenantDbService,
  ],
})
export class PublicModule {}
