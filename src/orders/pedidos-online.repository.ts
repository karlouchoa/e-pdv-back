import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineRow = {
  ID: string;
  CDEMP: number | null;
  ID_CLIENTE: string | null;
  STATUS: string;
  PUBLIC_TOKEN?: string | null;
  TOTAL_BRUTO: unknown;
  DESCONTO: unknown;
  TAXA_ENTREGA: unknown;
  TOTAL_LIQ: unknown;
  OBS: string | null;
  ID_VENDA?: string | null;
  DT_CONFIRMACAO?: Date | null;
  CONFIRMADO_POR?: string | null;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineRepository {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  // TEMP: After db pull substitute with Prisma models.
  async findById(
    tenant: string,
    id: string,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineRow | null> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    const rows = await prisma.$queryRaw<PedidoOnlineRow[]>(
      TenantPrisma.sql`
        SELECT
          ID,
          CDEMP,
          ID_CLIENTE,
          STATUS,
          TOTAL_BRUTO,
          DESCONTO,
          TAXA_ENTREGA,
          TOTAL_LIQ,
          OBS,
          ID_VENDA,
          DT_CONFIRMACAO,
          CONFIRMADO_POR
        FROM T_PedidosOnLine
        WHERE ID = ${id}
      `,
    );

    return rows[0] ?? null;
  }

  // TEMP: After db pull substitute with Prisma models.
  async updateStatusConfirmado(
    tenant: string,
    payload: {
      id: string;
      idVenda: string;
      confirmadoPor: string | null;
      totals: {
        subtotal: number;
        desconto: number;
        taxaEntrega: number;
        total: number;
      };
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineRow | null> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    const rows = await prisma.$queryRaw<PedidoOnlineRow[]>(
      TenantPrisma.sql`
        UPDATE T_PedidosOnLine
        SET
          STATUS = 'CONFIRMADO',
          DT_CONFIRMACAO = SYSDATETIME(),
          ID_VENDA = ${payload.idVenda},
          CONFIRMADO_POR = ${payload.confirmadoPor},
          TOTAL_BRUTO = ${payload.totals.subtotal},
          DESCONTO = ${payload.totals.desconto},
          TAXA_ENTREGA = ${payload.totals.taxaEntrega},
          TOTAL_LIQ = ${payload.totals.total}
        OUTPUT
          INSERTED.ID,
          INSERTED.CDEMP,
          INSERTED.ID_CLIENTE,
          INSERTED.STATUS,
          INSERTED.TOTAL_BRUTO,
          INSERTED.DESCONTO,
          INSERTED.TAXA_ENTREGA,
          INSERTED.TOTAL_LIQ,
          INSERTED.OBS,
          INSERTED.ID_VENDA,
          INSERTED.DT_CONFIRMACAO,
          INSERTED.CONFIRMADO_POR
        WHERE ID = ${payload.id}
          AND STATUS = 'ABERTO'
      `,
    );

    return rows[0] ?? null;
  }

  // TEMP: After db pull substitute with Prisma models.
  async create(
    tenant: string,
    payload: {
      cdemp: number;
      idCliente?: string | null;
      idEndereco?: string | null;
      canal?: string | null;
      obs?: string | null;
      totals: {
        subtotal: number;
        desconto: number;
        taxaEntrega: number;
        total: number;
      };
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineRow> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    const rows = await prisma.$queryRaw<PedidoOnlineRow[]>(
      TenantPrisma.sql`
        INSERT INTO T_PedidosOnLine (
          CDEMP,
          ID_CLIENTE,
          ID_ENDERECO,
          CANAL,
          STATUS,
          TOTAL_BRUTO,
          DESCONTO,
          TAXA_ENTREGA,
          TOTAL_LIQ,
          OBS
        )
        OUTPUT
          INSERTED.ID,
          INSERTED.CDEMP,
          INSERTED.ID_CLIENTE,
          INSERTED.STATUS,
          INSERTED.PUBLIC_TOKEN,
          INSERTED.TOTAL_BRUTO,
          INSERTED.DESCONTO,
          INSERTED.TAXA_ENTREGA,
          INSERTED.TOTAL_LIQ,
          INSERTED.OBS
        VALUES (
          ${payload.cdemp},
          ${payload.idCliente ?? null},
          ${payload.idEndereco ?? null},
          ${payload.canal ?? 'EPDV'},
          'ABERTO',
          ${payload.totals.subtotal},
          ${payload.totals.desconto},
          ${payload.totals.taxaEntrega},
          ${payload.totals.total},
          ${payload.obs ?? null}
        )
      `,
    );

    return rows[0];
  }
}
