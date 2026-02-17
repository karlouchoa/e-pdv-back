import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PedidosOnlineComboRepository } from './pedidos-online-combo.repository';
import { PedidosOnlineItensRepository } from './pedidos-online-itens.repository';
import { PedidosOnlineRepository } from './pedidos-online.repository';

@Injectable()
export class PedidosOnlineQueryService {
  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly pedidosOnlineRepo: PedidosOnlineRepository,
    private readonly pedidosOnlineItensRepo: PedidosOnlineItensRepository,
    private readonly pedidosOnlineComboRepo: PedidosOnlineComboRepository,
  ) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    if (typeof value === 'object') {
      const candidate = value as {
        toNumber?: () => number;
        toString?: () => string;
      };
      if (typeof candidate.toNumber === 'function') {
        return candidate.toNumber();
      }
      if (typeof candidate.toString === 'function') {
        return Number(candidate.toString());
      }
    }
    return Number(value);
  }

  async listForAdmin(
    tenant: string,
    payload: { status?: string | null; cdemp?: number | null; limit: number },
  ) {
    const normalizedStatus = (payload.status ?? '').trim().toUpperCase();
    const status =
      !normalizedStatus || normalizedStatus === 'ALL' ? null : normalizedStatus;

    const rows = await this.pedidosOnlineRepo.listAdminQueue(tenant, {
      status,
      cdemp: payload.cdemp ?? null,
      limit: payload.limit,
    });

    return rows.map((row) => ({
      id: row.ID,
      cdemp: row.CDEMP ?? null,
      idCliente: row.ID_CLIENTE ?? null,
      idEndereco: row.ID_ENDERECO ?? null,
      canal: row.CANAL ?? null,
      status: row.STATUS,
      dtPedido: row.DT_PEDIDO ?? null,
      totals: {
        subtotal: this.toNumber(row.TOTAL_BRUTO),
        discount: this.toNumber(row.DESCONTO),
        deliveryFee: this.toNumber(row.TAXA_ENTREGA),
        total: this.toNumber(row.TOTAL_LIQ),
      },
      idVenda: row.ID_VENDA ?? null,
      dtConfirmacao: row.DT_CONFIRMACAO ?? null,
      confirmadoPor: row.CONFIRMADO_POR ?? null,
      cliente: {
        nome: row.CLIENTE_NOME ?? null,
        telefone: row.CLIENTE_FONE ?? null,
        email: row.CLIENTE_EMAIL ?? null,
      },
      itemsCount: this.toNumber(row.ITEMS_COUNT),
      obs: row.OBS ?? null,
    }));
  }

  async getForAdmin(tenant: string, id: string) {
    const [pedido, itens] = await Promise.all([
      this.pedidosOnlineRepo.findDetailsById(tenant, id),
      this.pedidosOnlineItensRepo.listItensByPedidoId(tenant, id),
    ]);

    if (!pedido) {
      throw new NotFoundException('Pedido online nao encontrado.');
    }

    const prisma = await this.getPrisma(tenant);

    const choicesByPedidoItem = new Map<
      string,
      Awaited<
        ReturnType<PedidosOnlineComboRepository['listEscolhasByPedidoItemId']>
      >
    >();
    const allChoiceItemIds = new Set<string>();
    for (const item of itens) {
      const isCombo =
        (item.EH_COMBO ?? '').toString().trim().toUpperCase() === 'S';
      if (!isCombo) continue;

      const choices =
        await this.pedidosOnlineComboRepo.listEscolhasByPedidoItemId(
          tenant,
          item.ID,
        );

      choicesByPedidoItem.set(item.ID, choices);
      choices.forEach((choice) =>
        allChoiceItemIds.add(choice.ID_ITEM_ESCOLHIDO),
      );
    }

    const allItemIds = new Set<string>();
    itens.forEach((item) => allItemIds.add(item.ID_ITEM));
    allChoiceItemIds.forEach((itemId) => allItemIds.add(itemId));

    const itemRecords = allItemIds.size
      ? await prisma.t_itens.findMany({
          where: { ID: { in: Array.from(allItemIds) } },
          select: {
            ID: true,
            cditem: true,
            deitem: true,
            locfotitem: true,
          },
        })
      : [];

    const itemMap = new Map(
      itemRecords
        .filter((record) => Boolean(record.ID))
        .map((record) => [record.ID as string, record]),
    );

    const itemsDetailed = await Promise.all(
      itens.map(async (item) => {
        const record = itemMap.get(item.ID_ITEM);
        const choicesRaw = choicesByPedidoItem.get(item.ID) ?? [];

        return {
          id: item.ID,
          idItem: item.ID_ITEM,
          cditem: record?.cditem ?? null,
          descricao: record?.deitem ?? null,
          imagem: record?.locfotitem ?? null,
          quantity: this.toNumber(item.QTDE),
          unitPrice: this.toNumber(item.VLR_UNIT_CALC),
          total: this.toNumber(item.VLR_TOTAL_CALC),
          obs: item.OBS_ITEM ?? null,
          isCombo:
            (item.EH_COMBO ?? '').toString().trim().toUpperCase() === 'S',
          escolhas: choicesRaw.map((choice) => {
            const choiceRecord = itemMap.get(choice.ID_ITEM_ESCOLHIDO);
            return {
              id: choice.ID,
              idItemEscolhido: choice.ID_ITEM_ESCOLHIDO,
              cdgru: choice.CDGRU ?? null,
              quantity: this.toNumber(choice.QTDE),
              cditem: choiceRecord?.cditem ?? null,
              descricao: choiceRecord?.deitem ?? null,
            };
          }),
        };
      }),
    );

    return {
      id: pedido.ID,
      cdemp: pedido.CDEMP ?? null,
      idCliente: pedido.ID_CLIENTE ?? null,
      idEndereco: pedido.ID_ENDERECO ?? null,
      canal: pedido.CANAL ?? null,
      status: pedido.STATUS,
      dtPedido: pedido.DT_PEDIDO ?? null,
      totals: {
        subtotal: this.toNumber(pedido.TOTAL_BRUTO),
        discount: this.toNumber(pedido.DESCONTO),
        deliveryFee: this.toNumber(pedido.TAXA_ENTREGA),
        total: this.toNumber(pedido.TOTAL_LIQ),
      },
      idVenda: pedido.ID_VENDA ?? null,
      dtConfirmacao: pedido.DT_CONFIRMACAO ?? null,
      confirmadoPor: pedido.CONFIRMADO_POR ?? null,
      obs: pedido.OBS ?? null,
      cliente: {
        nome: pedido.CLIENTE_NOME ?? null,
        telefone: pedido.CLIENTE_FONE ?? null,
        email: pedido.CLIENTE_EMAIL ?? null,
      },
      endereco: {
        cep: pedido.END_CEP ?? null,
        logradouro: pedido.END_LOGRADOURO ?? null,
        numero: pedido.END_NUMERO ?? null,
        bairro: pedido.END_BAIRRO ?? null,
        cidade: pedido.END_CIDADE ?? null,
        uf: pedido.END_UF ?? null,
        complemento: pedido.END_COMPLEMENTO ?? null,
        referencia: pedido.END_REFERENCIA ?? null,
      },
      itemsCount: this.toNumber(pedido.ITEMS_COUNT),
      itens: itemsDetailed,
    };
  }
}
