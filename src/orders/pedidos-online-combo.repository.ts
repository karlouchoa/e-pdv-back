import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineComboRow = {
  ID: number;
  id: number;
  ID_PEDIDO_ITEM: number;
  id_pedido_item: number;
  CDGRU: number | null;
  cdgru: number | null;
  CDITEM_ESCOLHIDO: number | null;
  cditem_escolhido: number | null;
  EMPITEM_ESCOLHIDO: number | null;
  empitem_escolhido: number | null;
  QTDE: unknown;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineComboRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toInt(value: string | number) {
    const parsed =
      typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid numeric identifier '${value}'.`);
    }
    return parsed;
  }

  // TEMP: After db pull substitute with Prisma models.
  async listEscolhasByPedidoItemId(
    tenant: string,
    pedidoItemId: string | number,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineComboRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));
    const normalizedPedidoItemId = this.toInt(pedidoItemId);

    return prisma.$queryRaw<PedidoOnlineComboRow[]>(
      TenantPrisma.sql`
        SELECT
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO_ITEM AS "ID_PEDIDO_ITEM",
          ID_PEDIDO_ITEM AS "id_pedido_item",
          CDGRU AS "CDGRU",
          CDGRU AS "cdgru",
          CDITEM_ESCOLHIDO AS "CDITEM_ESCOLHIDO",
          CDITEM_ESCOLHIDO AS "cditem_escolhido",
          EMPITEM_ESCOLHIDO AS "EMPITEM_ESCOLHIDO",
          EMPITEM_ESCOLHIDO AS "empitem_escolhido",
          QTDE AS "QTDE"
        FROM T_PedidosOnLineComboEscolhas
        WHERE ID_PEDIDO_ITEM = ${normalizedPedidoItemId}
        ORDER BY ID
      `,
    );
  }

  // TEMP: After db pull substitute with Prisma models.
  async createChoice(
    tenant: string,
    payload: {
      pedidoItemId: number;
      cditemEscolhido: number;
      empitemEscolhido: number;
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
          CDITEM_ESCOLHIDO,
          EMPITEM_ESCOLHIDO,
          QTDE
        )
        VALUES (
          ${payload.pedidoItemId},
          ${payload.cdgru},
          ${payload.cditemEscolhido},
          ${payload.empitemEscolhido},
          ${payload.quantity}
        )
        RETURNING
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO_ITEM AS "ID_PEDIDO_ITEM",
          ID_PEDIDO_ITEM AS "id_pedido_item",
          CDGRU AS "CDGRU",
          CDGRU AS "cdgru",
          CDITEM_ESCOLHIDO AS "CDITEM_ESCOLHIDO",
          CDITEM_ESCOLHIDO AS "cditem_escolhido",
          EMPITEM_ESCOLHIDO AS "EMPITEM_ESCOLHIDO",
          EMPITEM_ESCOLHIDO AS "empitem_escolhido",
          QTDE AS "QTDE"
      `,
    );

    return rows[0];
  }
}
