import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { PedidosOnlineComboRepository } from '../orders/pedidos-online-combo.repository';
import { PedidosOnlineItensRepository } from '../orders/pedidos-online-itens.repository';
import { PedidosOnlineRepository } from '../orders/pedidos-online.repository';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreatePublicPedidoOnlineDto } from './dto/create-public-pedido-online.dto';
import { PublicPedidoOnlineResponseDto } from './dto/public-pedido-online-response.dto';

const COMBO_FLAG = 'S';

type ItemRecord = {
  ID: string | null;
  cdemp: number;
  cditem: number;
  cdgruit: number | null;
  deitem: string | null;
  undven: string | null;
  preco: unknown;
  precomin: unknown;
  custo: unknown;
  ativosn: string | null;
  dispven: string | null;
  ativoprod: string | null;
  isdeleted: boolean | null;
  negativo: string | null;
  ComboSN: string | null;
};

type NormalizedChoice = {
  idItemEscolhido: string;
  cdgru: number;
  quantity: number;
};

type ComboRule = {
  ID_ITEM: string;
  CDGRU: number;
  QTDE: unknown;
};

type ItemSnapshot = {
  recordId: string;
  record: ItemRecord;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  obsItem: string | null;
  isCombo: boolean;
  comboChoices: NormalizedChoice[];
};

type DeliveryMode = 'ENTREGA' | 'RETIRADA';

@Injectable()
export class PublicPedidosOnlineService {
  private readonly defaultCompanyId = 1;

  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly pedidosOnlineRepo: PedidosOnlineRepository,
    private readonly pedidosOnlineItensRepo: PedidosOnlineItensRepository,
    private readonly pedidosOnlineComboRepo: PedidosOnlineComboRepository,
  ) {}

  private async resolvePublicTenantDatabase(
    tenantSubdomain: string,
  ): Promise<string> {
    return this.tenantDbService.resolveTenantDatabaseNameBySubdomain(
      tenantSubdomain,
    );
  }

  private async getPrisma(tenantDatabase: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenantDatabase);
  }

  private normalizeFlag(value?: string | null) {
    return (value ?? '').toString().trim().toUpperCase();
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

  private roundDecimal(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private roundMoney(value: number): number {
    return this.roundDecimal(value, 2);
  }

  private roundQuantity(value: number): number {
    return this.roundDecimal(value, 3);
  }

  private normalizeText(
    value: string | undefined | null,
    maxLen: number,
  ): string | null {
    const trimmed = (value ?? '').toString().trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLen);
  }

  private resolveDeliveryMode(
    mode: string | undefined,
    hasAddress: boolean,
  ): DeliveryMode {
    const normalized = (mode ?? '').toString().trim().toUpperCase();
    if (normalized === 'ENTREGA' || normalized === 'RETIRADA') {
      return normalized;
    }
    return hasAddress ? 'ENTREGA' : 'RETIRADA';
  }

  private ensureItemAvailable(item: {
    cditem: number;
    deitem: string | null;
    ativosn: string | null;
    dispven: string | null;
    ativoprod: string | null;
    isdeleted: boolean | null;
  }) {
    const ativo = this.normalizeFlag(item.ativosn) === 'S';
    const dispven = this.normalizeFlag(item.dispven);
    const ativoprod = this.normalizeFlag(item.ativoprod);
    const bloqueado =
      item.isdeleted === true || dispven === 'N' || ativoprod === 'N';

    if (!ativo || bloqueado) {
      throw new BadRequestException(
        `Item ${item.cditem} nao esta disponivel para venda.`,
      );
    }

    const description = (item.deitem ?? '').trim();
    if (!description) {
      throw new BadRequestException(
        `Item ${item.cditem} sem descricao para venda.`,
      );
    }
  }

  private resolveCompanyId(records: ItemRecord[]): number {
    const companies = new Set(records.map((record) => record.cdemp));

    if (companies.size > 1) {
      throw new BadRequestException(
        'Itens do pedido pertencem a empresas diferentes.',
      );
    }

    if (companies.size === 1) {
      return companies.values().next().value as number;
    }

    return this.defaultCompanyId;
  }

  private normalizeChoices(
    pedidoItemId: string,
    choices:
      | Array<{ idItemEscolhido: string; cdgru: number; quantity: number }>
      | undefined,
  ): NormalizedChoice[] {
    if (!choices?.length) return [];

    const aggregated = new Map<string, NormalizedChoice>();

    for (const choice of choices) {
      const cdgru = this.toNumber(choice.cdgru);
      if (!Number.isFinite(cdgru) || !Number.isInteger(cdgru) || cdgru <= 0) {
        throw new BadRequestException(
          `Grupo invalido nas escolhas do item ${pedidoItemId}.`,
        );
      }

      const quantity = this.roundQuantity(this.toNumber(choice.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Quantidade invalida nas escolhas do item ${pedidoItemId}.`,
        );
      }

      const key = `${choice.idItemEscolhido}:${cdgru}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity = this.roundQuantity(existing.quantity + quantity);
      } else {
        aggregated.set(key, {
          idItemEscolhido: choice.idItemEscolhido,
          cdgru,
          quantity,
        });
      }
    }

    return Array.from(aggregated.values());
  }

  private validateComboChoicesByRules(payload: {
    comboItem: ItemRecord;
    comboQuantity: number;
    choices: NormalizedChoice[];
    comboRules: ComboRule[];
    itemMap: Map<string, ItemRecord>;
  }) {
    const { comboItem, comboQuantity, choices, comboRules, itemMap } = payload;

    if (!comboRules.length) {
      throw new BadRequestException(
        `Item combo ${comboItem.cditem} sem regras cadastradas em T_ItensCombo.`,
      );
    }

    const maxByGroup = new Map<number, number>();
    for (const rule of comboRules) {
      const group = this.toNumber(rule.CDGRU);
      const ruleQty = this.roundQuantity(this.toNumber(rule.QTDE));
      if (!Number.isInteger(group) || group <= 0) continue;
      if (!Number.isFinite(ruleQty) || ruleQty <= 0) continue;

      maxByGroup.set(group, this.roundQuantity(ruleQty * comboQuantity));
    }

    if (!maxByGroup.size) {
      throw new BadRequestException(
        `Item combo ${comboItem.cditem} sem quantidade valida em T_ItensCombo.`,
      );
    }

    const selectedByGroup = new Map<number, number>();
    for (const choice of choices) {
      const choiceRecord = itemMap.get(choice.idItemEscolhido);
      if (!choiceRecord) {
        throw new BadRequestException(
          `Item escolhido ${choice.idItemEscolhido} nao encontrado.`,
        );
      }

      if (choiceRecord.cdgruit !== choice.cdgru) {
        throw new BadRequestException(
          `Item escolhido ${choiceRecord.cditem} nao pertence ao grupo ${choice.cdgru}.`,
        );
      }

      if (!maxByGroup.has(choice.cdgru)) {
        throw new BadRequestException(
          `Grupo ${choice.cdgru} nao permitido para o combo ${comboItem.cditem}.`,
        );
      }

      selectedByGroup.set(
        choice.cdgru,
        this.roundQuantity(
          (selectedByGroup.get(choice.cdgru) ?? 0) + choice.quantity,
        ),
      );
    }

    for (const [group, selectedQty] of selectedByGroup.entries()) {
      const maxQty = maxByGroup.get(group) ?? 0;
      if (selectedQty > maxQty + Number.EPSILON) {
        throw new BadRequestException(
          `Quantidade escolhida no grupo ${group} excede o limite (${maxQty}) para o combo ${comboItem.cditem}.`,
        );
      }
    }
  }

  async createPedidoOnline(tenant: string, dto: CreatePublicPedidoOnlineDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const deliveryMode = this.resolveDeliveryMode(
      dto.tipoEntrega,
      Boolean(dto.idEndereco),
    );

    if (deliveryMode === 'ENTREGA' && !dto.idEndereco) {
      throw new BadRequestException(
        'Pedidos de entrega precisam informar o endereco.',
      );
    }

    if (!dto.idCliente && dto.idEndereco) {
      throw new BadRequestException(
        'Endereco informado sem cliente vinculado.',
      );
    }

    const tenantDatabase = await this.resolvePublicTenantDatabase(tenant);
    const prisma = await this.getPrisma(tenantDatabase);

    return prisma.$transaction(async (tx) => {
      if (dto.idCliente) {
        const clientExists = await tx.t_cli.findFirst({
          where: {
            id: dto.idCliente,
            OR: [{ isdeleted: false }, { isdeleted: null }],
          },
          select: { id: true },
        });

        if (!clientExists) {
          throw new BadRequestException('Cliente nao encontrado.');
        }
      }

      if (deliveryMode === 'ENTREGA' && dto.idEndereco && dto.idCliente) {
        const addressExists = await tx.t_ENDCLI.findFirst({
          where: {
            ID: dto.idEndereco,
            ID_CLIENTE: dto.idCliente,
            ISDELETED: false,
          },
          select: { ID: true },
        });

        if (!addressExists) {
          throw new BadRequestException(
            'Endereco informado nao pertence ao cliente.',
          );
        }
      }

      const itemIds = new Set<string>();
      const allIds = new Set<string>();

      for (const item of dto.items) {
        if (itemIds.has(item.idItem)) {
          throw new BadRequestException(
            `Item duplicado no pedido: ${item.idItem}.`,
          );
        }

        itemIds.add(item.idItem);
        allIds.add(item.idItem);

        if (item.comboChoices?.length) {
          for (const choice of item.comboChoices) {
            allIds.add(choice.idItemEscolhido);
          }
        }
      }

      const itemRecords = await tx.t_itens.findMany({
        where: { ID: { in: Array.from(allIds) } },
        select: {
          ID: true,
          cdemp: true,
          cditem: true,
          cdgruit: true,
          deitem: true,
          undven: true,
          preco: true,
          precomin: true,
          custo: true,
          ativosn: true,
          dispven: true,
          ativoprod: true,
          isdeleted: true,
          negativo: true,
          ComboSN: true,
        },
      });

      const itemMap = new Map<string, ItemRecord>();
      for (const record of itemRecords) {
        if (record.ID) {
          itemMap.set(record.ID, record);
        }
      }

      for (const itemId of allIds) {
        if (!itemMap.has(itemId)) {
          throw new BadRequestException(`Item ${itemId} nao encontrado.`);
        }
      }

      const recordsForCompany = Array.from(itemIds).map((itemId) => {
        return itemMap.get(itemId) as ItemRecord;
      });
      const cdemp = this.resolveCompanyId(recordsForCompany);

      const comboRecordIds = Array.from(itemIds).filter((itemId) => {
        const record = itemMap.get(itemId);
        return this.normalizeFlag(record?.ComboSN) === COMBO_FLAG;
      });

      const comboRules = comboRecordIds.length
        ? await tx.t_ItensCombo.findMany({
            where: { ID_ITEM: { in: comboRecordIds } },
            select: {
              ID_ITEM: true,
              CDGRU: true,
              QTDE: true,
            },
          })
        : [];
      const comboRulesByItem = new Map<string, ComboRule[]>();
      for (const rule of comboRules as ComboRule[]) {
        const rules = comboRulesByItem.get(rule.ID_ITEM) ?? [];
        rules.push(rule);
        comboRulesByItem.set(rule.ID_ITEM, rules);
      }

      const snapshots: ItemSnapshot[] = [];

      for (const item of dto.items) {
        const record = itemMap.get(item.idItem);
        if (!record) {
          throw new BadRequestException(`Item ${item.idItem} nao encontrado.`);
        }

        if (!record.ID) {
          throw new BadRequestException(
            `Item ${record.cditem} sem ID cadastrado.`,
          );
        }
        const recordId = record.ID;

        this.ensureItemAvailable(record);

        const quantity = this.roundQuantity(this.toNumber(item.quantity));
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Quantidade invalida para o item ${record.cditem}.`,
          );
        }

        const unitPrice = this.roundMoney(this.toNumber(record.preco));
        if (!Number.isFinite(unitPrice)) {
          throw new BadRequestException(
            `Item ${record.cditem} sem preco configurado.`,
          );
        }

        const lineTotal = this.roundMoney(unitPrice * quantity);

        const isCombo = this.normalizeFlag(record.ComboSN) === COMBO_FLAG;
        const normalizedChoices = this.normalizeChoices(
          item.idItem,
          item.comboChoices,
        );

        if (isCombo && !normalizedChoices.length) {
          throw new BadRequestException(
            `Item combo ${record.cditem} sem escolhas informadas.`,
          );
        }

        if (!isCombo && normalizedChoices.length) {
          throw new BadRequestException(
            `Item ${record.cditem} nao e combo e nao pode receber escolhas.`,
          );
        }

        if (isCombo) {
          this.validateComboChoicesByRules({
            comboItem: record,
            comboQuantity: quantity,
            choices: normalizedChoices,
            comboRules: comboRulesByItem.get(recordId) ?? [],
            itemMap,
          });
        }

        for (const choice of normalizedChoices) {
          const choiceRecord = itemMap.get(choice.idItemEscolhido);
          if (!choiceRecord) {
            throw new BadRequestException(
              `Item escolhido ${choice.idItemEscolhido} nao encontrado.`,
            );
          }

          if (choiceRecord.cdemp !== cdemp) {
            throw new BadRequestException(
              `Item escolhido ${choiceRecord.cditem} pertence a outra empresa.`,
            );
          }

          this.ensureItemAvailable({
            cditem: choiceRecord.cditem,
            deitem: choiceRecord.deitem,
            ativosn: choiceRecord.ativosn,
            dispven: choiceRecord.dispven,
            ativoprod: choiceRecord.ativoprod,
            isdeleted: choiceRecord.isdeleted,
          });
        }

        snapshots.push({
          recordId,
          record,
          quantity,
          unitPrice,
          lineTotal,
          obsItem: this.normalizeText(item.obsItem, 300),
          isCombo,
          comboChoices: normalizedChoices,
        });
      }

      const subtotal = this.roundMoney(
        snapshots.reduce((sum, item) => sum + item.lineTotal, 0),
      );
      const desconto = this.roundMoney(this.toNumber(dto.desconto ?? 0));
      const taxaEntrega =
        deliveryMode === 'RETIRADA'
          ? 0
          : this.roundMoney(this.toNumber(dto.taxaEntrega ?? 0));

      if (!Number.isFinite(desconto) || desconto < 0) {
        throw new BadRequestException('Desconto invalido.');
      }

      if (!Number.isFinite(taxaEntrega) || taxaEntrega < 0) {
        throw new BadRequestException('Taxa de entrega invalida.');
      }

      const total = this.roundMoney(subtotal - desconto + taxaEntrega);
      if (!Number.isFinite(total) || total < 0) {
        throw new BadRequestException('Total do pedido nao pode ser negativo.');
      }

      const pedido = await this.pedidosOnlineRepo.create(
        tenantDatabase,
        {
          cdemp,
          idCliente: dto.idCliente ?? null,
          idEndereco:
            deliveryMode === 'ENTREGA' ? (dto.idEndereco ?? null) : null,
          canal:
            this.normalizeText(dto.canal, 20) ??
            (deliveryMode === 'ENTREGA' ? 'ENTREGA' : 'RETIRADA'),
          obs: this.normalizeText(dto.obs, 500),
          totals: {
            subtotal,
            desconto,
            taxaEntrega,
            total,
          },
        },
        tx,
      );

      const createdItems = [] as Array<{
        id: string;
        idItem: string;
        cditem: number;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        isCombo: boolean;
        comboChoices?: NormalizedChoice[];
      }>;

      for (const snapshot of snapshots) {
        const pedidoItem = await this.pedidosOnlineItensRepo.createItem(
          tenantDatabase,
          {
            pedidoId: pedido.ID,
            itemId: snapshot.recordId,
            quantity: snapshot.quantity,
            unitPrice: snapshot.unitPrice,
            total: snapshot.lineTotal,
            obsItem: snapshot.obsItem,
            isCombo: snapshot.isCombo,
          },
          tx,
        );

        for (const choice of snapshot.comboChoices) {
          await this.pedidosOnlineComboRepo.createChoice(
            tenantDatabase,
            {
              pedidoItemId: pedidoItem.ID,
              idItemEscolhido: choice.idItemEscolhido,
              cdgru: choice.cdgru,
              quantity: choice.quantity,
            },
            tx,
          );
        }

        createdItems.push({
          id: pedidoItem.ID,
          idItem: snapshot.recordId,
          cditem: snapshot.record.cditem,
          description: (snapshot.record.deitem ?? '').trim(),
          quantity: snapshot.quantity,
          unitPrice: snapshot.unitPrice,
          total: snapshot.lineTotal,
          isCombo: snapshot.isCombo,
          comboChoices: snapshot.comboChoices.length
            ? snapshot.comboChoices
            : undefined,
        });
      }

      const response = {
        idPedidoOnline: pedido.ID,
        status: pedido.STATUS,
        publicToken: pedido.PUBLIC_TOKEN ?? null,
        totals: {
          subtotal,
          discount: desconto,
          deliveryFee: taxaEntrega,
          total,
        },
        items: createdItems,
      };

      return plainToInstance(PublicPedidoOnlineResponseDto, response, {
        excludeExtraneousValues: true,
      });
    });
  }

  async listPedidosByCliente(
    tenant: string,
    payload: { idCliente: string; limit: number },
  ) {
    const tenantDatabase = await this.resolvePublicTenantDatabase(tenant);
    const rows = await this.pedidosOnlineRepo.listByClient(
      tenantDatabase,
      payload,
    );

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
      obs: row.OBS ?? null,
      cliente: {
        nome: row.CLIENTE_NOME ?? null,
        telefone: row.CLIENTE_FONE ?? null,
        email: row.CLIENTE_EMAIL ?? null,
      },
      itemsCount: this.toNumber(row.ITEMS_COUNT),
    }));
  }

  async getPedidoPublic(tenant: string, id: string) {
    const tenantDatabase = await this.resolvePublicTenantDatabase(tenant);
    const pedido = await this.pedidosOnlineRepo.findDetailsById(
      tenantDatabase,
      id,
    );
    if (!pedido) {
      throw new NotFoundException('Pedido online nao encontrado.');
    }

    const [itens, prisma] = await Promise.all([
      this.pedidosOnlineItensRepo.listItensByPedidoId(tenantDatabase, id),
      this.getPrisma(tenantDatabase),
    ]);

    const choicesByPedidoItem = new Map<
      string,
      Awaited<
        ReturnType<PedidosOnlineComboRepository['listEscolhasByPedidoItemId']>
      >
    >();
    const allItemIds = new Set<string>();
    itens.forEach((item) => allItemIds.add(item.ID_ITEM));

    for (const item of itens) {
      const isCombo = this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG;
      if (!isCombo) continue;

      const choices =
        await this.pedidosOnlineComboRepo.listEscolhasByPedidoItemId(
          tenantDatabase,
          item.ID,
        );

      choicesByPedidoItem.set(item.ID, choices);
      choices.forEach((choice) => allItemIds.add(choice.ID_ITEM_ESCOLHIDO));
    }

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
      itens: itens.map((item) => {
        const record = itemMap.get(item.ID_ITEM);
        const choices = choicesByPedidoItem.get(item.ID) ?? [];
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
          isCombo: this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG,
          escolhas: choices.map((choice) => {
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
    };
  }
}
