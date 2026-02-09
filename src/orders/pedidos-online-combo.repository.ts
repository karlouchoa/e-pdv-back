import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineComboRow = {
  ID: string;
  ID_PEDIDO_ITEM: string;
  CDGRU: number | null;
  ID_ITEM_ESCOLHIDO: string;
  QTDE: unknown;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineComboRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  // TEMP: After db pull substitute with Prisma models.
  async listEscolhasByPedidoItemId(
    tenant: string,
    pedidoItemId: string,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineComboRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    return prisma.$queryRaw<PedidoOnlineComboRow[]>(
      TenantPrisma.sql`
        SELECT
          ID,
          ID_PEDIDO_ITEM,
          CDGRU,
          ID_ITEM_ESCOLHIDO,
          QTDE
        FROM T_PedidosOnLineComboEscolhas
        WHERE ID_PEDIDO_ITEM = ${pedidoItemId}
        ORDER BY ID
      `,
    );
  }

  // TEMP: After db pull substitute with Prisma models.
  async createChoice(
    tenant: string,
    payload: {
      pedidoItemId: string;
      idItemEscolhido: string;
      cdgru: number;
      quantity: number;
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineComboRow> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    const rows = await prisma.$queryRaw<PedidoOnlineComboRow[]>(
      TenantPrisma.sql`
        INSERT INTO T_PedidosOnLineComboEscolhas (
          ID_PEDIDO_ITEM,
          CDGRU,
          ID_ITEM_ESCOLHIDO,
          QTDE
        )
        OUTPUT
          INSERTED.ID,
          INSERTED.ID_PEDIDO_ITEM,
          INSERTED.CDGRU,
          INSERTED.ID_ITEM_ESCOLHIDO,
          INSERTED.QTDE
        VALUES (
          ${payload.pedidoItemId},
          ${payload.cdgru},
          ${payload.idItemEscolhido},
          ${payload.quantity}
        )
      `,
    );

    return rows[0];
  }
}
