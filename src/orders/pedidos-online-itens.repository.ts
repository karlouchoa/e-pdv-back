import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineItemRow = {
  ID: string;
  id: string;
  ID_PEDIDO: string;
  id_pedido: string;
  ID_ITEM: string;
  id_item: string;
  QTDE: unknown;
  VLR_UNIT_CALC: unknown;
  VLR_TOTAL_CALC: unknown;
  OBS_ITEM: string | null;
  EH_COMBO: string;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineItensRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private asUuid(value: string) {
    return TenantPrisma.sql`${value}::uuid`;
  }

  // TEMP: After db pull substitute with Prisma models.
  async listItensByPedidoId(
    tenant: string,
    pedidoId: string,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineItemRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    return prisma.$queryRaw<PedidoOnlineItemRow[]>(
      TenantPrisma.sql`
        SELECT
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO AS "ID_PEDIDO",
          ID_PEDIDO AS "id_pedido",
          ID_ITEM AS "ID_ITEM",
          ID_ITEM AS "id_item",
          QTDE AS "QTDE",
          VLR_UNIT_CALC AS "VLR_UNIT_CALC",
          VLR_TOTAL_CALC AS "VLR_TOTAL_CALC",
          OBS_ITEM AS "OBS_ITEM",
          EH_COMBO AS "EH_COMBO"
        FROM T_PedidosOnLineItens
        WHERE ID_PEDIDO = ${this.asUuid(pedidoId)}
        ORDER BY ID
      `,
    );
  }

  // TEMP: After db pull substitute with Prisma models.
  async updateCalculatedValues(
    tenant: string,
    updates: Array<{ id: string; unitPrice: number; total: number }>,
    prismaOverride?: TenantClientLike,
  ): Promise<void> {
    if (!updates.length) return;

    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    for (const update of updates) {
      await prisma.$executeRaw(
        TenantPrisma.sql`
          UPDATE T_PedidosOnLineItens
          SET
            VLR_UNIT_CALC = ${update.unitPrice},
            VLR_TOTAL_CALC = ${update.total}
          WHERE ID = ${this.asUuid(update.id)}
        `,
      );
    }
  }

  // TEMP: After db pull substitute with Prisma models.
  async createItem(
    tenant: string,
    payload: {
      pedidoId: string;
      itemId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      obsItem?: string | null;
      isCombo?: boolean;
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineItemRow> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));
    const comboFlag = payload.isCombo ? 'S' : 'N';

    const rows = await prisma.$queryRaw<PedidoOnlineItemRow[]>(
      TenantPrisma.sql`
        INSERT INTO T_PedidosOnLineItens (
          ID_PEDIDO,
          ID_ITEM,
          QTDE,
          VLR_UNIT_CALC,
          VLR_TOTAL_CALC,
          OBS_ITEM,
          EH_COMBO
        )
        VALUES (
          ${this.asUuid(payload.pedidoId)},
          ${this.asUuid(payload.itemId)},
          ${payload.quantity},
          ${payload.unitPrice},
          ${payload.total},
          ${payload.obsItem ?? null},
          ${comboFlag}
        )
        RETURNING
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO AS "ID_PEDIDO",
          ID_PEDIDO AS "id_pedido",
          ID_ITEM AS "ID_ITEM",
          ID_ITEM AS "id_item",
          QTDE AS "QTDE",
          VLR_UNIT_CALC AS "VLR_UNIT_CALC",
          VLR_TOTAL_CALC AS "VLR_TOTAL_CALC",
          OBS_ITEM AS "OBS_ITEM",
          EH_COMBO AS "EH_COMBO"
      `,
    );

    return rows[0];
  }
}
