import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineComboRow = {
  ID: string;
  id: string;
  ID_PEDIDO_ITEM: string;
  id_pedido_item: string;
  CDGRU: number | null;
  cdgru: number | null;
  ID_ITEM_ESCOLHIDO: string;
  id_item_escolhido: string;
  QTDE: unknown;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineComboRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private asUuid(value: string) {
    return TenantPrisma.sql`${value}::uuid`;
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
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO_ITEM AS "ID_PEDIDO_ITEM",
          ID_PEDIDO_ITEM AS "id_pedido_item",
          CDGRU AS "CDGRU",
          CDGRU AS "cdgru",
          ID_ITEM_ESCOLHIDO AS "ID_ITEM_ESCOLHIDO",
          ID_ITEM_ESCOLHIDO AS "id_item_escolhido",
          QTDE AS "QTDE"
        FROM T_PedidosOnLineComboEscolhas
        WHERE ID_PEDIDO_ITEM = ${this.asUuid(pedidoItemId)}
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
        VALUES (
          ${this.asUuid(payload.pedidoItemId)},
          ${payload.cdgru},
          ${this.asUuid(payload.idItemEscolhido)},
          ${payload.quantity}
        )
        RETURNING
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO_ITEM AS "ID_PEDIDO_ITEM",
          ID_PEDIDO_ITEM AS "id_pedido_item",
          CDGRU AS "CDGRU",
          CDGRU AS "cdgru",
          ID_ITEM_ESCOLHIDO AS "ID_ITEM_ESCOLHIDO",
          ID_ITEM_ESCOLHIDO AS "id_item_escolhido",
          QTDE AS "QTDE"
      `,
    );

    return rows[0];
  }
}
