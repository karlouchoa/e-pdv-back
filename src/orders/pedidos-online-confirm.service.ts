import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { ConfirmOnlineOrderResponseDto } from './dto/confirm-online-order-response.dto';
import type { PedidoOnlineRow } from './pedidos-online.repository';
import { PedidosOnlineRepository } from './pedidos-online.repository';
import type { PedidoOnlineItemRow } from './pedidos-online-itens.repository';
import { PedidosOnlineItensRepository } from './pedidos-online-itens.repository';
import type { PedidoOnlineComboRow } from './pedidos-online-combo.repository';
import { PedidosOnlineComboRepository } from './pedidos-online-combo.repository';

const COMBO_FLAG = 'S';
const FORMULA_FLAG = 'S';
type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PedidosOnlineConfirmService {
  private readonly logger = new Logger(PedidosOnlineConfirmService.name);
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

  private normalizeUserCode(value?: string | null): string {
    const trimmed = (value ?? '').toString().trim();
    if (!trimmed) {
      throw new BadRequestException('Usuario nao identificado no token.');
    }
    return trimmed.slice(0, 10);
  }

  private normalizeConfirmedBy(value?: string | null): string {
    const trimmed = (value ?? '').toString().trim();
    if (!trimmed) {
      throw new BadRequestException('Usuario nao identificado no token.');
    }
    return trimmed.slice(0, 50);
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

  private async resolveCompanyId(
    prisma: TenantClientLike,
    pedido: PedidoOnlineRow,
    itemRecords: Array<{ cdemp: number }>,
  ): Promise<number> {
    if (typeof pedido.CDEMP === 'number') {
      return pedido.CDEMP;
    }

    const uniqueCompanies = new Set(itemRecords.map((item) => item.cdemp));
    if (uniqueCompanies.size === 1) {
      return uniqueCompanies.values().next().value as number;
    }

    if (uniqueCompanies.size > 1) {
      throw new BadRequestException(
        'Itens do pedido pertencem a empresas diferentes.',
      );
    }

    const matriz = await prisma.t_emp.findFirst({
      where: { matriz: 'S' },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    return matriz?.cdemp ?? this.defaultCompanyId;
  }

  private async getNextSaleNumber(
    prisma: TenantClientLike,
    cdemp: number,
  ): Promise<number> {
    const result = await prisma.t_vendas.aggregate({
      _max: { nrven_v: true },
      where: { cdemp_v: cdemp },
    });

    const current = this.toNumber(result._max.nrven_v ?? 0);
    return current + 1;
  }

  private buildVendaData(
    pedido: PedidoOnlineRow,
    totals: {
      subtotal: number;
      desconto: number;
      taxaEntrega: number;
      total: number;
    },
    cdemp: number,
    nrven: number,
    userCode: string,
    now: Date,
  ): Prisma.t_vendasUncheckedCreateInput {
    return {
      nrven_v: nrven,
      cdemp_v: cdemp,
      codusu_v: userCode,
      emisven_v: now,
      totpro_v: totals.subtotal,
      totven_v: totals.total,
      vdesc_v: totals.desconto,
      pdesc_v:
        totals.subtotal > 0
          ? this.roundMoney((totals.desconto / totals.subtotal) * 100)
          : 0,
      obsven_v: pedido.OBS ?? undefined,
      ID_CLIENTE: pedido.ID_CLIENTE ?? undefined,
    };
  }

  private buildItsvenData(payload: {
    cdemp: number;
    nrven: number;
    item: {
      ID?: string | null;
      cditem: number;
      deitem: string | null;
      undven: string | null;
      cdgruit: number | null;
      precomin: unknown;
      custo: unknown;
    };
    quantity: number;
    unitPrice: number;
    mp: 'S' | 'N';
    emisven: Date;
    vendaId: string;
  }): Prisma.t_itsvenUncheckedCreateInput {
    const minPrice =
      payload.mp === 'S'
        ? 0
        : this.roundMoney(this.toNumber(payload.item.precomin));
    const cost = this.roundDecimal(this.toNumber(payload.item.custo), 4);

    return {
      empven: payload.cdemp,
      nrven_iv: payload.nrven,
      cdemp_iv: payload.cdemp,
      cditem_iv: payload.item.cditem,
      deitem_iv: (payload.item.deitem ?? '').trim(),
      unditem_iv: payload.item.undven ?? undefined,
      cdgru_iv: payload.item.cdgruit ?? undefined,
      precmin_iv: minPrice,
      precven_iv: payload.unitPrice,
      precpra_iv: payload.unitPrice,
      qtdesol_iv: payload.quantity,
      perdes_iv: 0,
      emisven_iv: payload.emisven,
      compra_iv: cost,
      custo_iv: cost,
      mp: payload.mp,
      ID_ITEM: payload.item.ID ?? undefined,
      ID_VENDA: payload.vendaId,
    };
  }

  private buildMovestData(payload: {
    cdemp: number;
    cditem: number;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    cost: number;
    nrven: number;
    userCode: string;
    now: Date;
    obs?: string | null;
  }): Prisma.t_movestCreateManyInput {
    return {
      cdemp: payload.cdemp,
      data: payload.now,
      datadoc: payload.now,
      datalan: payload.now,
      numdoc: payload.nrven,
      especie: 'V',
      cditem: payload.cditem,
      qtde: payload.quantity,
      valor: payload.totalValue,
      preco: payload.unitPrice,
      custo: this.roundMoney(payload.cost),
      st: 'S',
      codusu: payload.userCode,
      obs: payload.obs ?? null,
      obsit: payload.obs ?? null,
      empitem: payload.cdemp,
      empven: payload.cdemp,
      empmov: payload.cdemp,
      isdeleted: false,
      createdat: payload.now,
      updatedat: payload.now,
    };
  }

  async confirmar(
    tenant: string,
    pedidoId: string,
    userIdentifier?: string | null,
  ) {
    const prisma = await this.getPrisma(tenant);

    return prisma.$transaction(async (tx) => {
      const pedido = await this.pedidosOnlineRepo.findById(
        tenant,
        pedidoId,
        tx,
      );
      const status = this.normalizeFlag(pedido?.STATUS);
      if (!pedido || status !== 'ABERTO') {
        throw new ConflictException('Pedido online nao esta aberto.');
      }

      const itens = await this.pedidosOnlineItensRepo.listItensByPedidoId(
        tenant,
        pedidoId,
        tx,
      );

      if (!itens.length) {
        throw new BadRequestException('Pedido online sem itens.');
      }

      const confirmedBy = this.normalizeConfirmedBy(
        userIdentifier ?? undefined,
      );
      const userCode = this.normalizeUserCode(userIdentifier ?? undefined);

      const comboItems = itens.filter(
        (item) => this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG,
      );

      const choicesByItem = new Map<string, PedidoOnlineComboRow[]>();
      for (const comboItem of comboItems) {
        const choices =
          await this.pedidosOnlineComboRepo.listEscolhasByPedidoItemId(
            tenant,
            comboItem.ID,
            tx,
          );

        if (!choices.length) {
          throw new BadRequestException(
            `Item combo ${comboItem.ID_ITEM} sem escolhas registradas.`,
          );
        }

        choicesByItem.set(comboItem.ID, choices);
      }

      const allItemIds = new Set<string>();
      itens.forEach((item) => allItemIds.add(item.ID_ITEM));
      for (const choices of choicesByItem.values()) {
        choices.forEach((choice) => allItemIds.add(choice.ID_ITEM_ESCOLHIDO));
      }

      const itemIdList = Array.from(allItemIds);
      const itemWhere: Prisma.t_itensWhereInput = {
        ID: { in: itemIdList },
      };

      if (typeof pedido.CDEMP === 'number') {
        itemWhere.cdemp = pedido.CDEMP;
      }

      const itemRecords = await tx.t_itens.findMany({
        where: itemWhere,
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
          negativo: true,
          isdeleted: true,
          itprodsn: true,
          ComboSN: true,
          cdgruit: true,
        },
      });

      if (!itemRecords.length) {
        throw new BadRequestException('Itens do pedido nao encontrados.');
      }

      const cdemp = await this.resolveCompanyId(tx, pedido, itemRecords);
      const itemMap = new Map(itemRecords.map((record) => [record.ID, record]));

      for (const itemId of itemIdList) {
        if (!itemMap.has(itemId)) {
          throw new BadRequestException(`Item ${itemId} nao encontrado.`);
        }
      }

      const parentSnapshots: Array<{
        pedidoItem: PedidoOnlineItemRow;
        record: (typeof itemRecords)[number];
        quantity: number;
        unitPrice: number;
        cost: number;
        minPrice: number;
        lineTotal: number;
        isCombo: boolean;
        isFormula: boolean;
      }> = [];

      const formulaParentIds: string[] = [];

      for (const item of itens) {
        const record = itemMap.get(item.ID_ITEM);
        if (!record) {
          throw new BadRequestException(
            `Item ${item.ID_ITEM} nao encontrado no catalogo.`,
          );
        }

        this.ensureItemAvailable(record);

        const quantity = this.toNumber(item.QTDE);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Quantidade invalida para o item ${record.cditem}.`,
          );
        }

        const unitPrice = this.roundMoney(this.toNumber(record.preco));
        const minPrice = this.roundMoney(this.toNumber(record.precomin));
        const cost = this.roundDecimal(this.toNumber(record.custo), 4);
        const lineTotal = this.roundMoney(unitPrice * quantity);

        const isCombo = this.normalizeFlag(record.ComboSN) === COMBO_FLAG;
        const isFormula = this.normalizeFlag(record.itprodsn) === FORMULA_FLAG;
        const pedidoCombo = this.normalizeFlag(item.EH_COMBO) === COMBO_FLAG;

        if (isCombo && isFormula) {
          throw new BadRequestException(
            `Item ${record.cditem} nao pode ser combo e formula ao mesmo tempo.`,
          );
        }

        if (pedidoCombo && !isCombo) {
          throw new BadRequestException(
            `Item ${record.cditem} marcado como combo, mas produto nao e combo.`,
          );
        }

        if (isCombo && !pedidoCombo) {
          throw new BadRequestException(
            `Item combo ${record.cditem} sem escolhas informadas.`,
          );
        }

        if (pedidoCombo && isFormula) {
          throw new BadRequestException(
            `Item ${record.cditem} com combo nao pode ter formula.`,
          );
        }

        if (isFormula) {
          formulaParentIds.push(item.ID_ITEM);
        }

        parentSnapshots.push({
          pedidoItem: item,
          record,
          quantity,
          unitPrice,
          cost,
          minPrice,
          lineTotal,
          isCombo,
          isFormula,
        });
      }

      await this.pedidosOnlineItensRepo.updateCalculatedValues(
        tenant,
        parentSnapshots.map((snapshot) => ({
          id: snapshot.pedidoItem.ID,
          unitPrice: snapshot.unitPrice,
          total: snapshot.lineTotal,
        })),
        tx,
      );

      const formulas = formulaParentIds.length
        ? await tx.t_formulas.findMany({
            where: {
              ID_ITEM: { in: formulaParentIds },
              ...(typeof cdemp === 'number' ? { cdemp } : {}),
            },
          })
        : [];

      const formulasByItem = new Map<string, typeof formulas>();
      for (const formula of formulas) {
        const list = formulasByItem.get(formula.ID_ITEM ?? '') ?? [];
        list.push(formula);
        formulasByItem.set(formula.ID_ITEM ?? '', list);
      }

      for (const itemId of formulaParentIds) {
        if (!formulasByItem.get(itemId)?.length) {
          throw new BadRequestException(
            `Produto com formula ${itemId} nao possui materias primas cadastradas.`,
          );
        }
      }

      const matprimaCodes = Array.from(
        new Set(
          formulas
            .map((formula) => formula.matprima)
            .filter((value): value is number => typeof value === 'number'),
        ),
      );
      const matprimaIds = Array.from(
        new Set(
          formulas
            .map((formula) => formula.ID_MATPRIMA?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const matprimaRecords =
        matprimaCodes.length || matprimaIds.length
          ? await tx.t_itens.findMany({
              where: {
                cdemp,
                OR: [
                  ...(matprimaIds.length ? [{ ID: { in: matprimaIds } }] : []),
                  ...(matprimaCodes.length
                    ? [{ cditem: { in: matprimaCodes } }]
                    : []),
                ],
              },
              select: {
                ID: true,
                cditem: true,
                deitem: true,
                undven: true,
                precomin: true,
                custo: true,
                ativosn: true,
                dispven: true,
                ativoprod: true,
                isdeleted: true,
                cdgruit: true,
              },
            })
          : [];

      const matprimaMapByCode = new Map(
        matprimaRecords.map((record) => [record.cditem, record]),
      );
      const matprimaMapById = new Map(
        matprimaRecords
          .filter((record) => Boolean(record.ID))
          .map((record) => [record.ID as string, record]),
      );

      const totalsSubtotal = this.roundMoney(
        parentSnapshots.reduce((sum, item) => sum + item.lineTotal, 0),
      );
      const desconto = this.roundMoney(this.toNumber(pedido.DESCONTO));
      const taxaEntrega = this.roundMoney(this.toNumber(pedido.TAXA_ENTREGA));
      const totalLiquido = this.roundMoney(
        totalsSubtotal - desconto + taxaEntrega,
      );

      const now = new Date();
      const nrven = await this.getNextSaleNumber(tx, cdemp);

      const vendaRecord = await tx.t_vendas.create({
        data: this.buildVendaData(
          pedido,
          {
            subtotal: totalsSubtotal,
            desconto,
            taxaEntrega,
            total: totalLiquido,
          },
          cdemp,
          nrven,
          userCode,
          now,
        ),
      });

      const vendaId = (vendaRecord.ID ?? '').trim();
      if (!vendaId) {
        throw new BadRequestException('Venda nao gerou ID valido.');
      }

      const parentLines: Prisma.t_itsvenUncheckedCreateInput[] =
        parentSnapshots.map((snapshot) =>
          this.buildItsvenData({
            cdemp,
            nrven,
            item: snapshot.record,
            quantity: snapshot.quantity,
            unitPrice: snapshot.unitPrice,
            mp: 'N',
            emisven: now,
            vendaId,
          }),
        );

      const componentLines: Prisma.t_itsvenUncheckedCreateInput[] = [];

      for (const snapshot of parentSnapshots) {
        if (snapshot.isCombo) {
          const choices = choicesByItem.get(snapshot.pedidoItem.ID) ?? [];
          const aggregated = new Map<string, number>();

          for (const choice of choices) {
            const quantity = this.toNumber(choice.QTDE);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              throw new BadRequestException(
                `Quantidade invalida em escolha do combo ${snapshot.record.cditem}.`,
              );
            }

            aggregated.set(
              choice.ID_ITEM_ESCOLHIDO,
              (aggregated.get(choice.ID_ITEM_ESCOLHIDO) ?? 0) + quantity,
            );
          }

          for (const [choiceItemId, quantity] of aggregated.entries()) {
            const record = itemMap.get(choiceItemId);
            if (!record) {
              throw new BadRequestException(
                `Item escolhido ${choiceItemId} nao encontrado no catalogo.`,
              );
            }

            this.ensureItemAvailable(record);

            componentLines.push(
              this.buildItsvenData({
                cdemp,
                nrven,
                item: record,
                quantity,
                unitPrice: 0,
                mp: 'S',
                emisven: now,
                vendaId,
              }),
            );
          }
        }

        if (snapshot.isFormula) {
          const formulasForItem =
            formulasByItem.get(snapshot.record.ID ?? '') ?? [];
          const aggregated = new Map<
            string,
            {
              quantity: number;
              matprimaCode: number;
              matprimaId: string | null;
            }
          >();

          for (const formula of formulasForItem) {
            const qtdFormula = this.toNumber(formula.qtdemp);
            if (!Number.isFinite(qtdFormula) || qtdFormula <= 0) {
              throw new BadRequestException(
                `Quantidade invalida na formula do item ${snapshot.record.cditem}.`,
              );
            }

            const totalQty = this.roundDecimal(
              qtdFormula * snapshot.quantity,
              6,
            );
            const matprimaId = formula.ID_MATPRIMA?.trim() ?? null;
            const matprimaCode = this.toNumber(formula.matprima);
            const key = matprimaId ? `ID:${matprimaId}` : `CD:${matprimaCode}`;

            const existing = aggregated.get(key);
            if (existing) {
              existing.quantity = this.roundDecimal(
                existing.quantity + totalQty,
                6,
              );
            } else {
              aggregated.set(key, {
                quantity: totalQty,
                matprimaCode,
                matprimaId,
              });
            }
          }

          for (const entry of aggregated.values()) {
            const quantity = entry.quantity;
            if (!Number.isFinite(quantity) || quantity <= 0) {
              throw new BadRequestException(
                `Quantidade invalida para materia prima ${entry.matprimaCode}.`,
              );
            }

            const record = entry.matprimaId
              ? (matprimaMapById.get(entry.matprimaId) ??
                matprimaMapByCode.get(entry.matprimaCode))
              : matprimaMapByCode.get(entry.matprimaCode);
            if (!record) {
              throw new BadRequestException(
                `Materia prima ${entry.matprimaId ?? entry.matprimaCode} nao encontrada no catalogo.`,
              );
            }

            this.ensureItemAvailable({
              cditem: record.cditem,
              deitem: record.deitem,
              ativosn: record.ativosn,
              dispven: record.dispven,
              ativoprod: record.ativoprod,
              isdeleted: record.isdeleted,
            });

            componentLines.push(
              this.buildItsvenData({
                cdemp,
                nrven,
                item: record,
                quantity,
                unitPrice: 0,
                mp: 'S',
                emisven: now,
                vendaId,
              }),
            );
          }
        }
      }

      await tx.t_itsven.createMany({ data: parentLines });
      if (componentLines.length) {
        await tx.t_itsven.createMany({ data: componentLines });
      }

      const movestLines: Prisma.t_movestCreateManyInput[] = [];

      for (const snapshot of parentSnapshots) {
        movestLines.push(
          this.buildMovestData({
            cdemp,
            cditem: snapshot.record.cditem,
            quantity: snapshot.quantity,
            unitPrice: snapshot.unitPrice,
            totalValue: snapshot.lineTotal,
            cost: snapshot.cost,
            nrven,
            userCode,
            now,
            obs: `Pedido online ${pedidoId}`,
          }),
        );
      }

      for (const component of componentLines) {
        const cditem = this.toNumber(component.cditem_iv);
        const quantity = this.toNumber(component.qtdesol_iv);
        if (!Number.isFinite(cditem) || cditem <= 0) continue;
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        const unitPrice = this.roundMoney(this.toNumber(component.precven_iv));
        const totalValue = this.roundMoney(unitPrice * quantity);
        const cost = this.roundDecimal(this.toNumber(component.custo_iv), 4);

        movestLines.push(
          this.buildMovestData({
            cdemp,
            cditem,
            quantity,
            unitPrice,
            totalValue,
            cost,
            nrven,
            userCode,
            now,
            obs: `Pedido online ${pedidoId} (componente)`,
          }),
        );
      }

      if (movestLines.length) {
        await tx.t_movest.createMany({ data: movestLines });
      }

      const updatedPedido = await this.pedidosOnlineRepo.updateStatusConfirmado(
        tenant,
        {
          id: pedidoId,
          idVenda: vendaId,
          confirmadoPor: confirmedBy,
          totals: {
            subtotal: totalsSubtotal,
            desconto,
            taxaEntrega,
            total: totalLiquido,
          },
        },
        tx,
      );

      if (!updatedPedido) {
        throw new ConflictException('Pedido online nao esta aberto.');
      }

      const response = {
        idPedidoOnline: updatedPedido.ID,
        status: updatedPedido.STATUS,
        idVenda: vendaId,
        totals: {
          subtotal: totalsSubtotal,
          discount: desconto,
          deliveryFee: taxaEntrega,
          total: totalLiquido,
        },
        insertedLines: {
          parentLines: parentLines.length,
          componentLines: componentLines.length,
        },
      };

      this.logger.log(
        `Pedido online ${updatedPedido.ID} confirmado. Venda ${vendaId}.`,
      );

      return plainToInstance(ConfirmOnlineOrderResponseDto, response, {
        excludeExtraneousValues: true,
      });
    });
  }
}
