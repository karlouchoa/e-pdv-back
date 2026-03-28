import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { listCompatibleComboRulesByItemCodes } from '../lib/combo-schema-compat';
import { PedidosOnlineComboRepository } from '../orders/pedidos-online-combo.repository';
import { PedidosOnlineItensRepository } from '../orders/pedidos-online-itens.repository';
import { PedidosOnlineRepository } from '../orders/pedidos-online.repository';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreatePublicPedidoOnlineDto } from './dto/create-public-pedido-online.dto';
import { PublicPedidoOnlineResponseDto } from './dto/public-pedido-online-response.dto';

const COMBO_FLAG = 'S';

type ItemRecord = {
  id: string;
  cdemp: number;
  cditem: number;
  cdgruit: number | null;
  subgru: number | null;
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
  combosn: string | null;
};

type NormalizedChoice = {
  idItemEscolhido: number;
  cdgru: number;
  quantity: number;
};

type ComboRule = {
  cdgru: number;
  qtde: unknown;
  subgroupCdsub?: number | null;
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
type PaymentType = 'DINHEIRO' | 'C. CREDITO' | 'C. DEBITO' | 'pix';

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

  private normalizePaymentType(value: string | undefined): PaymentType {
    const normalized = (value ?? '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/\./g, '');

    if (normalized === 'DINHEIRO') return 'DINHEIRO';
    if (normalized === 'pix') return 'pix';
    if (normalized === 'CCREDITO' || normalized === 'CREDITO') {
      return 'C. CREDITO';
    }
    if (normalized === 'CDEBITO' || normalized === 'DEBITO') {
      return 'C. DEBITO';
    }

    throw new BadRequestException(
      'Tipo de pagamento invalido. Use DINHEIRO, C. CREDITO, C. DEBITO ou pix.',
    );
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
    pedidoItemId: number,
    choices:
      | Array<{ idItemEscolhido: number; cdgru: number; quantity: number }>
      | undefined,
  ): NormalizedChoice[] {
    if (!choices?.length) return [];

    const aggregated = new Map<string, NormalizedChoice>();

    for (const choice of choices) {
      const choiceId = this.toNumber(choice.idItemEscolhido);
      if (!Number.isInteger(choiceId) || choiceId <= 0) {
        throw new BadRequestException(
          `Item escolhido invalido nas escolhas do item ${pedidoItemId}.`,
        );
      }
      const cdgru = this.toNumber(choice.cdgru);
      if (!Number.isFinite(cdgru) || !Number.isInteger(cdgru) || cdgru <= 0) {
        throw new BadRequestException(
          `Subgrupo invalido nas escolhas do item ${pedidoItemId}.`,
        );
      }

      const quantity = this.roundQuantity(this.toNumber(choice.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Quantidade invalida nas escolhas do item ${pedidoItemId}.`,
        );
      }

      const key = `${choiceId}:${cdgru}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity = this.roundQuantity(existing.quantity + quantity);
      } else {
        aggregated.set(key, {
          idItemEscolhido: choiceId,
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
    itemMap: Map<number, ItemRecord>;
  }) {
    const { comboItem, comboQuantity, choices, comboRules, itemMap } = payload;

    if (!comboRules.length) {
      throw new BadRequestException(
        `Item combo ${comboItem.cditem} sem regras cadastradas em t_itenscombo.`,
      );
    }

    const maxByGroup = new Map<number, number>();
    for (const rule of comboRules) {
      const group = this.toNumber(rule.cdgru);
      const ruleQty = this.roundQuantity(this.toNumber(rule.qtde));
      if (!Number.isInteger(group) || group <= 0) continue;
      if (!Number.isFinite(ruleQty) || ruleQty <= 0) continue;

      maxByGroup.set(group, this.roundQuantity(ruleQty * comboQuantity));
    }

    if (!maxByGroup.size) {
      throw new BadRequestException(
        `Item combo ${comboItem.cditem} sem quantidade valida em t_itenscombo.`,
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

      const expectedSubgroup =
        comboRules.find((rule) => rule.cdgru === choice.cdgru)?.subgroupCdsub ??
        choice.cdgru;

      if (choiceRecord.subgru !== expectedSubgroup) {
        throw new BadRequestException(
          `Item escolhido ${choiceRecord.cditem} nao pertence ao subgrupo ${choice.cdgru}.`,
        );
      }

      if (!maxByGroup.has(choice.cdgru)) {
        throw new BadRequestException(
          `Subgrupo ${choice.cdgru} nao permitido para o combo ${comboItem.cditem}.`,
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
          `Quantidade escolhida no subgrupo ${group} excede o limite (${maxQty}) para o combo ${comboItem.cditem}.`,
        );
      }
    }
  }

  async createPedidoOnline(tenant: string, dto: CreatePublicPedidoOnlineDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }
    if (!dto.cdcli) {
      throw new BadRequestException(
        'Defina o cliente antes de finalizar o pedido.',
      );
    }

    const deliveryMode = this.resolveDeliveryMode(
      dto.tipoEntrega,
      Boolean(dto.autocodEndereco),
    );
    const tipoPagto = this.normalizePaymentType(dto.tipoPagto);
    const trocoParaSolicitado = this.roundMoney(
      this.toNumber(dto.trocoPara ?? 0),
    );
    if (!Number.isFinite(trocoParaSolicitado) || trocoParaSolicitado < 0) {
      throw new BadRequestException('Troco para invalido.');
    }
    const trocoPara = tipoPagto === 'DINHEIRO' ? trocoParaSolicitado : 0;

    if (deliveryMode === 'ENTREGA' && !dto.autocodEndereco) {
      throw new BadRequestException(
        'Pedidos de entrega precisam informar o endereco.',
      );
    }

    const tenantDatabase = await this.resolvePublicTenantDatabase(tenant);
    const prisma = await this.getPrisma(tenantDatabase);

    return prisma.$transaction(async (tx) => {
      const clientRecord =
        dto.cdcli
          ? await tx.t_cli.findFirst({
              where: {
                cdcli: dto.cdcli,
                OR: [{ isdeleted: false }, { isdeleted: null }],
              },
              select: { cdcli: true },
            })
          : null;

      if (dto.cdcli) {
        if (!clientRecord) {
          throw new BadRequestException('Cliente nao encontrado.');
        }
      }

      if (deliveryMode === 'ENTREGA' && dto.autocodEndereco && dto.cdcli) {
        const addressExists = await tx.t_endcli.findFirst({
          where: {
            autocod: dto.autocodEndereco,
            cdcli: clientRecord?.cdcli,
            isdeleted: false,
          },
          select: { autocod: true },
        });

        if (!addressExists) {
          throw new BadRequestException(
            'Endereco informado nao pertence ao cliente.',
          );
        }
      }

      const itemIds = new Set<number>();
      const allIds = new Set<number>();

      for (const item of dto.items) {
        const cditem = this.toNumber(item.cditem);
        itemIds.add(cditem);
        allIds.add(cditem);

        if (item.comboChoices?.length) {
          for (const choice of item.comboChoices) {
            allIds.add(this.toNumber(choice.idItemEscolhido));
          }
        }
      }

      const itemRecords = await tx.t_itens.findMany({
        where: { cditem: { in: Array.from(allIds) } },
        select: {
          cdemp: true,
          cditem: true,
          cdgruit: true,
          subgru: true,
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
          combosn: true,
        },
      });

      const recordsByItemCode = new Map<number, ItemRecord[]>();
      for (const record of itemRecords) {
        const records = recordsByItemCode.get(record.cditem) ?? [];
        records.push({ ...record, id: String(record.cditem) });
        recordsByItemCode.set(record.cditem, records);
      }

      for (const itemId of allIds) {
        if (!recordsByItemCode.has(itemId)) {
          throw new BadRequestException(`Item ${itemId} nao encontrado.`);
        }
      }

      let companyCandidates: Set<number> | null = null;
      for (const itemId of itemIds) {
        const companies = new Set<number>(
          (recordsByItemCode.get(itemId) ?? []).map((record) => record.cdemp),
        );
        if (!companies.size) {
          throw new BadRequestException(`Item ${itemId} nao encontrado.`);
        }
        companyCandidates =
          companyCandidates === null
            ? companies
            : new Set<number>(
                (Array.from(companyCandidates.values()) as number[]).filter(
                  (company) =>
                  companies.has(company),
                ),
              );
      }

      if (!companyCandidates?.size) {
        throw new BadRequestException(
          'Nao foi possivel determinar a empresa dos itens informados.',
        );
      }
      if (companyCandidates.size > 1) {
        throw new BadRequestException(
          'Itens informados pertencem a mais de uma empresa. Informe itens de uma unica empresa.',
        );
      }

      const cdemp = Array.from(companyCandidates)[0];
      const itemMap = new Map<number, ItemRecord>();
      for (const [itemCode, records] of recordsByItemCode.entries()) {
        const record = records.find((entry) => entry.cdemp === cdemp);
        if (!record) {
          throw new BadRequestException(
            `Item ${itemCode} nao encontrado na empresa do pedido.`,
          );
        }
        itemMap.set(itemCode, record);
      }

      const comboRulesByItem = new Map<number, ComboRule[]>();

      const comboItemIds = dto.items
        .map((item) => this.toNumber(item.cditem))
        .filter((cditem) => {
          const record = itemMap.get(cditem);
          return record
            ? this.normalizeFlag(record.combosn) === COMBO_FLAG
            : false;
        });
      if (comboItemIds.length) {
        const rawRules = await listCompatibleComboRulesByItemCodes(
          tx,
          comboItemIds,
        );
        for (const rule of rawRules) {
          const bucket = comboRulesByItem.get(rule.cditem ?? 0) ?? [];
          bucket.push({
            cdgru: rule.cdgru,
            qtde: rule.qtde,
            subgroupCdsub: rule.subgroupCdsub ?? null,
          });
          comboRulesByItem.set(rule.cditem ?? 0, bucket);
        }
      }

      const snapshots: ItemSnapshot[] = [];

      for (const item of dto.items) {
        const cditem = this.toNumber(item.cditem);
        const record = itemMap.get(cditem);
        if (!record) {
          throw new BadRequestException(`Item ${item.cditem} nao encontrado.`);
        }

        const recordId = record.id;

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

        const isCombo = this.normalizeFlag(record.combosn) === COMBO_FLAG;
        const normalizedChoices = this.normalizeChoices(
          cditem,
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
          const comboRules = comboRulesByItem.get(record.cditem) ?? [];
          this.validateComboChoicesByRules({
            comboItem: record,
            comboQuantity: quantity,
            choices: normalizedChoices,
            comboRules,
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
          cdcli: dto.cdcli ?? null,
          endereco:
            deliveryMode === 'ENTREGA' ? (dto.autocodEndereco ?? null) : null,
          canal:
            this.normalizeText(dto.canal, 20) ??
            (deliveryMode === 'ENTREGA' ? 'ENTREGA' : 'RETIRADA'),
          obs: this.normalizeText(dto.obs, 500),
          trocoPara,
          tipoPagto,
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
        id: number;
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
            pedidoId: pedido.id,
            cditem: snapshot.record.cditem,
            empitem: snapshot.record.cdemp,
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
              pedidoItemId: pedidoItem.id,
              cditemEscolhido: choice.idItemEscolhido,
              empitemEscolhido: cdemp,
              cdgru: choice.cdgru,
              quantity: choice.quantity,
            },
            tx,
          );
        }

        createdItems.push({
          id: pedidoItem.id,
          idItem: String(snapshot.record.cditem),
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
        idPedidoOnline: pedido.id,
        pedido: this.toNumber(pedido.PEDIDO),
        status: pedido.STATUS,
        publicToken: pedido.PUBLIC_TOKEN ?? null,
        tipoPagto: this.normalizeText(pedido.TipoPagto, 15) ?? tipoPagto,
        trocoPara: this.toNumber(pedido.TrocoPara ?? trocoPara),
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
    payload: { cdcli: number; limit: number },
  ) {
    const tenantDatabase = await this.resolvePublicTenantDatabase(tenant);
    const rows = await this.pedidosOnlineRepo.listByClient(
      tenantDatabase,
      payload,
    );

    return rows.map((row) => ({
      id: row.id,
      pedido: this.toNumber(row.PEDIDO),
      cdemp: row.CDEMP ?? null,
      cdcli: row.cdcli ?? null,
      autocodEndereco: row.endereco ?? null,
      canal: row.CANAL ?? null,
      status: row.STATUS,
      tipoPagto: row.TipoPagto ?? null,
      trocoPara: this.toNumber(row.TrocoPara),
      dtPedido: row.DT_PEDIDO ?? null,
      totals: {
        subtotal: this.toNumber(row.TOTAL_BRUTO),
        discount: this.toNumber(row.DESCONTO),
        deliveryFee: this.toNumber(row.TAXA_ENTREGA),
        total: this.toNumber(row.TOTAL_LIQ),
      },
      nrven: row.nrven ?? null,
      idVenda: row.nrven ?? null,
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

  async getPedidoPublic(tenant: string, id: number | string) {
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
      number,
      Awaited<
        ReturnType<PedidosOnlineComboRepository['listEscolhasByPedidoItemId']>
      >
    >();
    const allItemIds = new Set<number>();
    itens.forEach((item) => allItemIds.add(item.cditem));

    for (const item of itens) {
      const isCombo = this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG;
      if (!isCombo) continue;

      const choices =
        await this.pedidosOnlineComboRepo.listEscolhasByPedidoItemId(
          tenantDatabase,
          item.id,
        );

      choicesByPedidoItem.set(item.id, choices);
      choices.forEach((choice) => {
        if (choice.CDITEM_ESCOLHIDO !== null) {
          allItemIds.add(choice.CDITEM_ESCOLHIDO);
        }
      });
    }

    const itemRecords = allItemIds.size
      ? await prisma.t_itens.findMany({
          where: {
            ...(typeof pedido.CDEMP === 'number' ? { cdemp: pedido.CDEMP } : {}),
            cditem: { in: Array.from(allItemIds) },
          },
          select: {
            cditem: true,
            deitem: true,
            locfotitem: true,
          },
        })
      : [];

    const itemMap = new Map(
      itemRecords.map((record) => [record.cditem, record]),
    );

    return {
      id: pedido.id,
      pedido: this.toNumber(pedido.PEDIDO),
      cdemp: pedido.CDEMP ?? null,
      cdcli: pedido.cdcli ?? null,
      autocodEndereco: pedido.endereco ?? null,
      canal: pedido.CANAL ?? null,
      status: pedido.STATUS,
      tipoPagto: pedido.TipoPagto ?? null,
      trocoPara: this.toNumber(pedido.TrocoPara),
      dtPedido: pedido.DT_PEDIDO ?? null,
      totals: {
        subtotal: this.toNumber(pedido.TOTAL_BRUTO),
        discount: this.toNumber(pedido.DESCONTO),
        deliveryFee: this.toNumber(pedido.TAXA_ENTREGA),
        total: this.toNumber(pedido.TOTAL_LIQ),
      },
      nrven: pedido.nrven ?? null,
      idVenda: pedido.nrven ?? null,
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
        const record = itemMap.get(item.cditem);
        const choices = choicesByPedidoItem.get(item.id) ?? [];
        return {
          id: String(item.id),
          idItem: String(record?.cditem ?? item.cditem),
          cditem: record?.cditem ?? null,
          descricao: record?.deitem ?? null,
          imagem: record?.locfotitem ?? null,
          quantity: this.toNumber(item.QTDE),
          unitPrice: this.toNumber(item.VLR_UNIT_CALC),
          total: this.toNumber(item.VLR_TOTAL_CALC),
          obs: item.OBS_ITEM ?? null,
          isCombo: this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG,
          escolhas: choices.map((choice) => {
            const choiceRecord =
              choice.CDITEM_ESCOLHIDO !== null
                ? itemMap.get(choice.CDITEM_ESCOLHIDO)
                : undefined;
            return {
              id: String(choice.id),
              idItemEscolhido:
                choice.CDITEM_ESCOLHIDO !== null
                  ? String(choice.CDITEM_ESCOLHIDO)
                  : null,
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
