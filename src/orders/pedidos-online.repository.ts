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
  ID_ENDERECO?: string | null;
  CANAL?: string | null;
  STATUS: string;
  DT_PEDIDO?: Date | null;
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

export type PedidoOnlineListRow = PedidoOnlineRow & {
  CLIENTE_NOME?: string | null;
  CLIENTE_FONE?: string | null;
  CLIENTE_EMAIL?: string | null;
  ITEMS_COUNT?: unknown;
};

export type PedidoOnlineDetailsRow = PedidoOnlineListRow & {
  END_CEP?: string | null;
  END_LOGRADOURO?: string | null;
  END_NUMERO?: string | null;
  END_BAIRRO?: string | null;
  END_CIDADE?: string | null;
  END_UF?: string | null;
  END_COMPLEMENTO?: string | null;
  END_REFERENCIA?: string | null;
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
          ID_ENDERECO,
          CANAL,
          STATUS,
          DT_PEDIDO,
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
          INSERTED.ID_ENDERECO,
          INSERTED.CANAL,
          INSERTED.STATUS,
          INSERTED.DT_PEDIDO,
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
          INSERTED.ID_ENDERECO,
          INSERTED.CANAL,
          INSERTED.STATUS,
          INSERTED.DT_PEDIDO,
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

  async listByClient(
    tenant: string,
    payload: {
      idCliente: string;
      limit: number;
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineListRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    return prisma.$queryRaw<PedidoOnlineListRow[]>(
      TenantPrisma.sql`
        SELECT
          p.ID,
          p.CDEMP,
          p.ID_CLIENTE,
          p.ID_ENDERECO,
          p.CANAL,
          p.STATUS,
          p.DT_PEDIDO,
          p.TOTAL_BRUTO,
          p.DESCONTO,
          p.TAXA_ENTREGA,
          p.TOTAL_LIQ,
          p.OBS,
          p.ID_VENDA,
          p.DT_CONFIRMACAO,
          p.CONFIRMADO_POR,
          c.decli AS CLIENTE_NOME,
          CONCAT(ISNULL(c.dddcli, ''), ISNULL(COALESCE(NULLIF(c.celcli, ''), c.fonecli), '')) AS CLIENTE_FONE,
          c.emailcli AS CLIENTE_EMAIL,
          ISNULL(i.ITEMS_COUNT, 0) AS ITEMS_COUNT
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.id = p.ID_CLIENTE
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE p.ID_CLIENTE = ${payload.idCliente}
        ORDER BY p.DT_PEDIDO DESC, p.ID DESC
        OFFSET 0 ROWS FETCH NEXT ${payload.limit} ROWS ONLY
      `,
    );
  }

  async listAdminQueue(
    tenant: string,
    payload: {
      status?: string | null;
      cdemp?: number | null;
      limit: number;
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineListRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    return prisma.$queryRaw<PedidoOnlineListRow[]>(
      TenantPrisma.sql`
        SELECT
          p.ID,
          p.CDEMP,
          p.ID_CLIENTE,
          p.ID_ENDERECO,
          p.CANAL,
          p.STATUS,
          p.DT_PEDIDO,
          p.TOTAL_BRUTO,
          p.DESCONTO,
          p.TAXA_ENTREGA,
          p.TOTAL_LIQ,
          p.OBS,
          p.ID_VENDA,
          p.DT_CONFIRMACAO,
          p.CONFIRMADO_POR,
          c.decli AS CLIENTE_NOME,
          CONCAT(ISNULL(c.dddcli, ''), ISNULL(COALESCE(NULLIF(c.celcli, ''), c.fonecli), '')) AS CLIENTE_FONE,
          c.emailcli AS CLIENTE_EMAIL,
          ISNULL(i.ITEMS_COUNT, 0) AS ITEMS_COUNT
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.id = p.ID_CLIENTE
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE (${payload.status ?? null} IS NULL OR p.STATUS = ${payload.status ?? null})
          AND (${payload.cdemp ?? null} IS NULL OR p.CDEMP = ${payload.cdemp ?? null})
        ORDER BY p.DT_PEDIDO ASC, p.ID ASC
        OFFSET 0 ROWS FETCH NEXT ${payload.limit} ROWS ONLY
      `,
    );
  }

  async findDetailsById(
    tenant: string,
    id: string,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineDetailsRow | null> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    const rows = await prisma.$queryRaw<PedidoOnlineDetailsRow[]>(
      TenantPrisma.sql`
        SELECT TOP 1
          p.ID,
          p.CDEMP,
          p.ID_CLIENTE,
          p.ID_ENDERECO,
          p.CANAL,
          p.STATUS,
          p.DT_PEDIDO,
          p.TOTAL_BRUTO,
          p.DESCONTO,
          p.TAXA_ENTREGA,
          p.TOTAL_LIQ,
          p.OBS,
          p.ID_VENDA,
          p.DT_CONFIRMACAO,
          p.CONFIRMADO_POR,
          c.decli AS CLIENTE_NOME,
          CONCAT(ISNULL(c.dddcli, ''), ISNULL(COALESCE(NULLIF(c.celcli, ''), c.fonecli), '')) AS CLIENTE_FONE,
          c.emailcli AS CLIENTE_EMAIL,
          e.CEP AS END_CEP,
          e.LOGRADOURO AS END_LOGRADOURO,
          e.NUMERO AS END_NUMERO,
          e.BAIRRO AS END_BAIRRO,
          e.CIDADE AS END_CIDADE,
          e.UF AS END_UF,
          e.COMPLEMENTO AS END_COMPLEMENTO,
          e.PONTO_REFERENCIA AS END_REFERENCIA,
          ISNULL(i.ITEMS_COUNT, 0) AS ITEMS_COUNT
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.id = p.ID_CLIENTE
        LEFT JOIN T_ENDCLI e ON e.ID = p.ID_ENDERECO
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE p.ID = ${id}
      `,
    );

    return rows[0] ?? null;
  }
}
