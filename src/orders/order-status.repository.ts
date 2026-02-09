import { Injectable } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { TenantPrisma } from '../lib/prisma-clients';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';

export type OrderStatusHistoryRow = {
  id: string;
  vendaId: string;
  status: string;
  source: string;
  note: string | null;
  changedBy: string | null;
  changedAt: Date;
};

@Injectable()
export class OrderStatusRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  // TEMP: Using raw SQL until manual SQL + db pull add Prisma model.
  async insertHistory(
    tenant: string,
    payload: {
      vendaId: string;
      status: string;
      source: string;
      note?: string | null;
      changedBy?: string | null;
    },
  ): Promise<OrderStatusHistoryRow> {
    const prisma = await this.getPrisma(tenant);

    const rows = await prisma.$queryRaw<OrderStatusHistoryRow[]>(
      TenantPrisma.sql`
        INSERT INTO app_order_status_history (
          venda_id,
          status,
          source,
          note,
          changed_by
        )
        OUTPUT
          INSERTED.id AS id,
          INSERTED.venda_id AS vendaId,
          INSERTED.status AS status,
          INSERTED.source AS source,
          INSERTED.note AS note,
          INSERTED.changed_by AS changedBy,
          INSERTED.changed_at AS changedAt
        VALUES (
          ${payload.vendaId},
          ${payload.status},
          ${payload.source},
          ${payload.note ?? null},
          ${payload.changedBy ?? null}
        )
      `,
    );

    return rows[0];
  }

  // TEMP: Using raw SQL until manual SQL + db pull add Prisma model.
  async listHistory(
    tenant: string,
    vendaId: string,
  ): Promise<OrderStatusHistoryRow[]> {
    const prisma = await this.getPrisma(tenant);

    return prisma.$queryRaw<OrderStatusHistoryRow[]>(
      TenantPrisma.sql`
        SELECT
          id,
          venda_id AS vendaId,
          status,
          source,
          note,
          changed_by AS changedBy,
          changed_at AS changedAt
        FROM app_order_status_history
        WHERE venda_id = ${vendaId}
        ORDER BY changed_at DESC
      `,
    );
  }
}
