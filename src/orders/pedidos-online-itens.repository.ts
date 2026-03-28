import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineItemRow = {
  ID: number;
  id: number;
  ID_PEDIDO: number;
  id_pedido: number;
  CDITEM: number;
  cditem: number;
  EMPITEM: number;
  empitem: number;
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

  private toInt(value: string | number) {
    const parsed =
      typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid numeric identifier '${value}'.`);
    }
    return parsed;
  }

  // TEMP: After db pull substitute with Prisma models.
  async listItensByPedidoId(
    tenant: string,
    pedidoId: string | number,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineItemRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));
    const normalizedPedidoId = this.toInt(pedidoId);

    return prisma.$queryRaw<PedidoOnlineItemRow[]>(
      TenantPrisma.sql`
        SELECT
          ID AS "ID",
          ID AS "id",
          ID_PEDIDO AS "ID_PEDIDO",
          ID_PEDIDO AS "id_pedido",
          CDITEM AS "CDITEM",
          CDITEM AS "cditem",
          EMPITEM AS "EMPITEM",
          EMPITEM AS "empitem",
          QTDE AS "QTDE",
          VLR_UNIT_CALC AS "VLR_UNIT_CALC",
          VLR_TOTAL_CALC AS "VLR_TOTAL_CALC",
          OBS_ITEM AS "OBS_ITEM",
          EH_COMBO AS "EH_COMBO"
        FROM T_PedidosOnLineItens
        WHERE ID_PEDIDO = ${normalizedPedidoId}
        ORDER BY ID
      `,
    );
  }

  // TEMP: After db pull substitute with Prisma models.
  async updateCalculatedValues(
    tenant: string,
    updates: Array<{ id: string | number; unitPrice: number; total: number }>,
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
          WHERE ID = ${this.toInt(update.id)}
        `,
      );
    }
  }

  // TEMP: After db pull substitute with Prisma models.
  async createItem(
    tenant: string,
    payload: {
      pedidoId: number;
      cditem: number;
      empitem: number;
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
          CDITEM,
          EMPITEM,
          QTDE,
          VLR_UNIT_CALC,
          VLR_TOTAL_CALC,
          OBS_ITEM,
          EH_COMBO
        )
        VALUES (
          ${payload.pedidoId},
          ${payload.cditem},
          ${payload.empitem},
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
          CDITEM AS "CDITEM",
          CDITEM AS "cditem",
          EMPITEM AS "EMPITEM",
          EMPITEM AS "empitem",
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
