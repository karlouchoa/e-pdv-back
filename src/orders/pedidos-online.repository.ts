import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';

export type PedidoOnlineRow = {
  ID: number;
  id: number;
  PEDIDO?: number | null;
  CDEMP: number | null;
  CDCLI: number | null;
  cdcli: number | null;
  ENDERECO?: number | null;
  endereco?: number | null;
  CANAL?: string | null;
  STATUS: string;
  DT_PEDIDO?: Date | null;
  PUBLIC_TOKEN?: string | null;
  TOTAL_BRUTO: unknown;
  DESCONTO: unknown;
  TAXA_ENTREGA: unknown;
  TOTAL_LIQ: unknown;
  OBS: string | null;
  NRVEN?: number | null;
  nrven?: number | null;
  DT_CONFIRMACAO?: Date | null;
  CONFIRMADO_POR?: string | null;
  TrocoPara?: unknown;
  TipoPagto?: string | null;
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

  private toInt(value: string | number) {
    const parsed =
      typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid numeric identifier '${value}'.`);
    }
    return parsed;
  }

  // TEMP: After db pull substitute with Prisma models.
  async findById(
    tenant: string,
    id: string | number,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineRow | null> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));
    const pedidoId = this.toInt(id);

    const rows = await prisma.$queryRaw<PedidoOnlineRow[]>(
      TenantPrisma.sql`
        SELECT
          ID AS "ID",
          ID AS "id",
          Pedido AS "PEDIDO",
          CDEMP AS "CDEMP",
          CDCLI AS "CDCLI",
          CDCLI AS "cdcli",
          ENDERECO AS "ENDERECO",
          ENDERECO AS "endereco",
          CANAL AS "CANAL",
          STATUS AS "STATUS",
          DT_PEDIDO AS "DT_PEDIDO",
          TOTAL_BRUTO AS "TOTAL_BRUTO",
          DESCONTO AS "DESCONTO",
          TAXA_ENTREGA AS "TAXA_ENTREGA",
          TOTAL_LIQ AS "TOTAL_LIQ",
          OBS AS "OBS",
          NRVEN AS "NRVEN",
          NRVEN AS "nrven",
          DT_CONFIRMACAO AS "DT_CONFIRMACAO",
          CONFIRMADO_POR AS "CONFIRMADO_POR",
          TrocoPara AS "TrocoPara",
          TipoPagto AS "TipoPagto"
        FROM T_PedidosOnLine
        WHERE ID = ${pedidoId}
      `,
    );

    return rows[0] ?? null;
  }

  // TEMP: After db pull substitute with Prisma models.
  async updateStatusConfirmado(
    tenant: string,
    payload: {
      id: string | number;
      nrven: number;
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
    const pedidoId = this.toInt(payload.id);

    const rows = await prisma.$queryRaw<PedidoOnlineRow[]>(
      TenantPrisma.sql`
        UPDATE T_PedidosOnLine
        SET
          STATUS = 'CONFIRMADO',
          DT_CONFIRMACAO = CURRENT_TIMESTAMP,
          NRVEN = ${payload.nrven},
          CONFIRMADO_POR = ${payload.confirmadoPor},
          TOTAL_BRUTO = ${payload.totals.subtotal},
          DESCONTO = ${payload.totals.desconto},
          TAXA_ENTREGA = ${payload.totals.taxaEntrega},
          TOTAL_LIQ = ${payload.totals.total}
        WHERE ID = ${pedidoId}
          AND STATUS = 'ABERTO'
        RETURNING
          ID AS "ID",
          ID AS "id",
          Pedido AS "PEDIDO",
          CDEMP AS "CDEMP",
          CDCLI AS "CDCLI",
          CDCLI AS "cdcli",
          ENDERECO AS "ENDERECO",
          ENDERECO AS "endereco",
          CANAL AS "CANAL",
          STATUS AS "STATUS",
          DT_PEDIDO AS "DT_PEDIDO",
          TOTAL_BRUTO AS "TOTAL_BRUTO",
          DESCONTO AS "DESCONTO",
          TAXA_ENTREGA AS "TAXA_ENTREGA",
          TOTAL_LIQ AS "TOTAL_LIQ",
          OBS AS "OBS",
          NRVEN AS "NRVEN",
          NRVEN AS "nrven",
          DT_CONFIRMACAO AS "DT_CONFIRMACAO",
          CONFIRMADO_POR AS "CONFIRMADO_POR",
          TrocoPara AS "TrocoPara",
          TipoPagto AS "TipoPagto"
      `,
    );

    return rows[0] ?? null;
  }

  // TEMP: After db pull substitute with Prisma models.
  async create(
    tenant: string,
    payload: {
      cdemp: number;
      cdcli?: number | null;
      endereco?: number | null;
      canal?: string | null;
      obs?: string | null;
      trocoPara?: number | null;
      tipoPagto?: string | null;
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
          CDCLI,
          ENDERECO,
          CANAL,
          STATUS,
          TOTAL_BRUTO,
          DESCONTO,
          TAXA_ENTREGA,
          TOTAL_LIQ,
          OBS,
          TrocoPara,
          TipoPagto
        )
        VALUES (
          ${payload.cdemp},
          ${payload.cdcli ?? null},
          ${payload.endereco ?? null},
          ${payload.canal ?? 'EPDV'},
          'ABERTO',
          ${payload.totals.subtotal},
          ${payload.totals.desconto},
          ${payload.totals.taxaEntrega},
          ${payload.totals.total},
          ${payload.obs ?? null},
          ${payload.trocoPara ?? null},
          ${payload.tipoPagto ?? null}
        )
        RETURNING
          ID AS "ID",
          ID AS "id",
          Pedido AS "PEDIDO",
          CDEMP AS "CDEMP",
          CDCLI AS "CDCLI",
          CDCLI AS "cdcli",
          ENDERECO AS "ENDERECO",
          ENDERECO AS "endereco",
          CANAL AS "CANAL",
          STATUS AS "STATUS",
          DT_PEDIDO AS "DT_PEDIDO",
          PUBLIC_TOKEN AS "PUBLIC_TOKEN",
          TOTAL_BRUTO AS "TOTAL_BRUTO",
          DESCONTO AS "DESCONTO",
          TAXA_ENTREGA AS "TAXA_ENTREGA",
          TOTAL_LIQ AS "TOTAL_LIQ",
          OBS AS "OBS",
          NRVEN AS "NRVEN",
          NRVEN AS "nrven",
          TrocoPara AS "TrocoPara",
          TipoPagto AS "TipoPagto"
      `,
    );

    return rows[0];
  }

  async listByClient(
    tenant: string,
    payload: {
      cdcli: number;
      limit: number;
    },
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineListRow[]> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));

    return prisma.$queryRaw<PedidoOnlineListRow[]>(
      TenantPrisma.sql`
        SELECT
          p.ID AS "ID",
          p.ID AS "id",
          ID AS "id",
          p.Pedido AS "PEDIDO",
          p.CDEMP AS "CDEMP",
          p.CDCLI AS "CDCLI",
          p.CDCLI AS "cdcli",
          p.ENDERECO AS "ENDERECO",
          p.ENDERECO AS "endereco",
          p.CANAL AS "CANAL",
          p.STATUS AS "STATUS",
          p.DT_PEDIDO AS "DT_PEDIDO",
          p.TOTAL_BRUTO AS "TOTAL_BRUTO",
          p.DESCONTO AS "DESCONTO",
          p.TAXA_ENTREGA AS "TAXA_ENTREGA",
          p.TOTAL_LIQ AS "TOTAL_LIQ",
          p.OBS AS "OBS",
          p.NRVEN AS "NRVEN",
          p.NRVEN AS "nrven",
          p.DT_CONFIRMACAO AS "DT_CONFIRMACAO",
          p.CONFIRMADO_POR AS "CONFIRMADO_POR",
          p.TrocoPara AS "TrocoPara",
          p.TipoPagto AS "TipoPagto",
          c.decli AS "CLIENTE_NOME",
          CONCAT(COALESCE(c.dddcli, ''), COALESCE(NULLIF(c.celcli, ''), c.fonecli, '')) AS "CLIENTE_FONE",
          c.emailcli AS "CLIENTE_EMAIL",
          COALESCE(i.ITEMS_COUNT, 0) AS "ITEMS_COUNT"
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.cdcli = p.CDCLI
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE p.CDCLI = ${payload.cdcli}
        ORDER BY p.DT_PEDIDO DESC, p.ID DESC
        LIMIT ${payload.limit}
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
          p.ID AS "ID",
          p.ID AS "id",
          ID AS "id",
          p.Pedido AS "PEDIDO",
          p.CDEMP AS "CDEMP",
          p.CDCLI AS "CDCLI",
          p.CDCLI AS "cdcli",
          p.ENDERECO AS "ENDERECO",
          p.ENDERECO AS "endereco",
          p.CANAL AS "CANAL",
          p.STATUS AS "STATUS",
          p.DT_PEDIDO AS "DT_PEDIDO",
          p.TOTAL_BRUTO AS "TOTAL_BRUTO",
          p.DESCONTO AS "DESCONTO",
          p.TAXA_ENTREGA AS "TAXA_ENTREGA",
          p.TOTAL_LIQ AS "TOTAL_LIQ",
          p.OBS AS "OBS",
          p.NRVEN AS "NRVEN",
          p.NRVEN AS "nrven",
          p.DT_CONFIRMACAO AS "DT_CONFIRMACAO",
          p.CONFIRMADO_POR AS "CONFIRMADO_POR",
          p.TrocoPara AS "TrocoPara",
          p.TipoPagto AS "TipoPagto",
          c.decli AS "CLIENTE_NOME",
          CONCAT(COALESCE(c.dddcli, ''), COALESCE(NULLIF(c.celcli, ''), c.fonecli, '')) AS "CLIENTE_FONE",
          c.emailcli AS "CLIENTE_EMAIL",
          COALESCE(i.ITEMS_COUNT, 0) AS "ITEMS_COUNT"
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.cdcli = p.CDCLI
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE (${payload.status ?? null} IS NULL OR p.STATUS = ${payload.status ?? null})
          AND (${payload.cdemp ?? null} IS NULL OR p.CDEMP = ${payload.cdemp ?? null})
        ORDER BY p.DT_PEDIDO ASC, p.ID ASC
        LIMIT ${payload.limit}
      `,
    );
  }

  async findDetailsById(
    tenant: string,
    id: string | number,
    prismaOverride?: TenantClientLike,
  ): Promise<PedidoOnlineDetailsRow | null> {
    const prisma = prismaOverride ?? (await this.getPrisma(tenant));
    const pedidoId = this.toInt(id);

    const rows = await prisma.$queryRaw<PedidoOnlineDetailsRow[]>(
      TenantPrisma.sql`
        SELECT
          p.ID AS "ID",
          p.ID AS "id",
          ID AS "id",
          p.Pedido AS "PEDIDO",
          p.CDEMP AS "CDEMP",
          p.CDCLI AS "CDCLI",
          p.CDCLI AS "cdcli",
          p.ENDERECO AS "ENDERECO",
          p.ENDERECO AS "endereco",
          p.CANAL AS "CANAL",
          p.STATUS AS "STATUS",
          p.DT_PEDIDO AS "DT_PEDIDO",
          p.TOTAL_BRUTO AS "TOTAL_BRUTO",
          p.DESCONTO AS "DESCONTO",
          p.TAXA_ENTREGA AS "TAXA_ENTREGA",
          p.TOTAL_LIQ AS "TOTAL_LIQ",
          p.OBS AS "OBS",
          p.NRVEN AS "NRVEN",
          p.NRVEN AS "nrven",
          p.DT_CONFIRMACAO AS "DT_CONFIRMACAO",
          p.CONFIRMADO_POR AS "CONFIRMADO_POR",
          p.TrocoPara AS "TrocoPara",
          p.TipoPagto AS "TipoPagto",
          c.decli AS "CLIENTE_NOME",
          CONCAT(COALESCE(c.dddcli, ''), COALESCE(NULLIF(c.celcli, ''), c.fonecli, '')) AS "CLIENTE_FONE",
          c.emailcli AS "CLIENTE_EMAIL",
          e.CEP AS "END_CEP",
          e.LOGRADOURO AS "END_LOGRADOURO",
          e.NUMERO AS "END_NUMERO",
          e.BAIRRO AS "END_BAIRRO",
          e.CIDADE AS "END_CIDADE",
          e.UF AS "END_UF",
          e.COMPLEMENTO AS "END_COMPLEMENTO",
          e.PONTO_REFERENCIA AS "END_REFERENCIA",
          COALESCE(i.ITEMS_COUNT, 0) AS "ITEMS_COUNT"
        FROM T_PedidosOnLine p
        LEFT JOIN t_cli c ON c.cdcli = p.CDCLI
        LEFT JOIN T_ENDCLI e ON e.AUTOCOD = p.ENDERECO
        LEFT JOIN (
          SELECT ID_PEDIDO, COUNT(1) AS ITEMS_COUNT
          FROM T_PedidosOnLineItens
          GROUP BY ID_PEDIDO
        ) i ON i.ID_PEDIDO = p.ID
        WHERE p.ID = ${pedidoId}
        LIMIT 1
      `,
    );

    return rows[0] ?? null;
  }
}
