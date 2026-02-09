import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class PublicPedidosOnlineService {
  private readonly defaultCompanyId = 1;

  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly pedidosOnlineRepo: PedidosOnlineRepository,
    private readonly pedidosOnlineItensRepo: PedidosOnlineItensRepository,
    private readonly pedidosOnlineComboRepo: PedidosOnlineComboRepository,
  ) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
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

  async createPedidoOnline(tenant: string, dto: CreatePublicPedidoOnlineDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const prisma = await this.getPrisma(tenant);

    return prisma.$transaction(async (tx) => {
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
      const taxaEntrega = this.roundMoney(this.toNumber(dto.taxaEntrega ?? 0));

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
        tenant,
        {
          cdemp,
          idCliente: dto.idCliente ?? null,
          idEndereco: dto.idEndereco ?? null,
          canal: this.normalizeText(dto.canal, 20) ?? undefined,
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
          tenant,
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
            tenant,
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
}
