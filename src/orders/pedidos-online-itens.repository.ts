import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineItemRow = {
  ID: string;
  ID_PEDIDO: string;
  ID_ITEM: string;
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
          ID,
          ID_PEDIDO,
          ID_ITEM,
          QTDE,
          VLR_UNIT_CALC,
          VLR_TOTAL_CALC,
          OBS_ITEM,
          EH_COMBO
        FROM T_PedidosOnLineItens
        WHERE ID_PEDIDO = ${pedidoId}
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
          WHERE ID = ${update.id}
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
        OUTPUT
          INSERTED.ID,
          INSERTED.ID_PEDIDO,
          INSERTED.ID_ITEM,
          INSERTED.QTDE,
          INSERTED.VLR_UNIT_CALC,
          INSERTED.VLR_TOTAL_CALC,
          INSERTED.OBS_ITEM,
          INSERTED.EH_COMBO
        VALUES (
          ${payload.pedidoId},
          ${payload.itemId},
          ${payload.quantity},
          ${payload.unitPrice},
          ${payload.total},
          ${payload.obsItem ?? null},
          ${comboFlag}
        )
      `,
    );

    return rows[0];
  }
}
