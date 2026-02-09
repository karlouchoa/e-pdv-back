import { Module } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminPedidosOnlineController } from './admin-pedidos-online.controller';
import { OrderStatusRepository } from './order-status.repository';
import { OrdersStatusService } from './orders-status.service';
import { PedidosOnlineConfirmService } from './pedidos-online-confirm.service';
import { PedidosOnlineRepository } from './pedidos-online.repository';
import { PedidosOnlineItensRepository } from './pedidos-online-itens.repository';
import { PedidosOnlineComboRepository } from './pedidos-online-combo.repository';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [AdminOrdersController, AdminPedidosOnlineController],
  providers: [
    TenantDbService,
    OrderStatusRepository,
    OrdersStatusService,
    PedidosOnlineRepository,
    PedidosOnlineItensRepository,
    PedidosOnlineComboRepository,
    PedidosOnlineConfirmService,
    RolesGuard,
  ],
})
export class OrdersModule {}
