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
import { applyMovestBalanceFromCreates } from '../lib/movest-balance';
import { buildCompatibleScalarSelect } from '../lib/tenant-schema-compat';

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
    preferredCdemp?: number | null,
  ): Promise<number> {
    if (
      preferredCdemp &&
      Number.isFinite(preferredCdemp) &&
      preferredCdemp > 0
    ) {
      const uniqueCompanies = new Set(itemRecords.map((item) => item.cdemp));
      if (uniqueCompanies.size && !uniqueCompanies.has(preferredCdemp)) {
        throw new BadRequestException(
          'Pedido contem itens de outra empresa diferente da selecionada.',
        );
      }
      return preferredCdemp;
    }

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

  private formatHour(value: Date): string {
    return value.toTimeString().slice(0, 8);
  }

  private resolveDeliveryType(canal?: string | null): 'E' | 'V' {
    const normalized = this.normalizeFlag(canal);
    if (normalized === 'RETIRADA') {
      return 'V';
    }
    return 'E';
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
    payload: {
      pedidoNumero: number;
      tipoEntrega: 'E' | 'V';
      cdcli: number | null;
      cdfpg: number | null;
      cdtpg: number | null;
      cdven: number | null;
      userId: string | null;
      userEmail: string | null;
      customerId: string | null;
      customerCompany: number | null;
      fpgtoId: string | null;
      tpgtoId: string | null;
      vendedorId: string | null;
      trocoPara: number;
      vlrAcresc: number;
      vlrPgDinheiro: number;
      vlrTroco: number;
      comissaoCliente: number;
      comissaoVendedor: number;
    },
  ): Prisma.t_vendasUncheckedCreateInput {
    const descontoPerc =
      totals.subtotal > 0
        ? this.roundMoney((totals.desconto / totals.subtotal) * 100)
        : 0;

    return {
      nrven_v: nrven,
      cdemp_v: cdemp,
      codusu_v: userCode,
      emisven_v: now,
      horaven_v: this.formatHour(now),
      cdcli_v: payload.cdcli ?? undefined,
      cdfpg_v: payload.cdfpg ?? undefined,
      cdtpg_v: payload.cdtpg ?? undefined,
      txfin_v: 0,
      restringe_v: 'S',
      cdven_v: payload.cdven ?? undefined,
      nrpedcli_v:
        payload.pedidoNumero > 0 ? String(payload.pedidoNumero) : undefined,
      tpent: payload.tipoEntrega,
      cdmid: 4,
      totpro_v: totals.subtotal,
      pdesc_v: descontoPerc,
      vdesc_v: totals.desconto,
      vlfrete_v: totals.taxaEntrega,
      totven_v: totals.total,
      tpven_v: 'BOL',
      obsven_v: (pedido.OBS ?? '').toString().trim().slice(0, 200) || undefined,
      status_v: 'A',
      dtstat_v: now,
      qtdimpres: 0,
      trocreq: 'N',
      pednum: payload.pedidoNumero > 0 ? payload.pedidoNumero : undefined,
      comcli_v: payload.comissaoCliente,
      comven_v: payload.comissaoVendedor,
      empcli: payload.customerCompany ?? undefined,
      userrest:
        (payload.userEmail?.trim() || payload.userId?.trim() || '').slice(
          0,
          15,
        ) || undefined,
      vlr_acresc: payload.vlrAcresc,
      vlrpgdinh: payload.vlrPgDinheiro,
      vlrtroco: payload.vlrTroco,
    };
  }

  private buildItsvenData(payload: {
    cdemp: number;
    nrven: number;
    autocodVenda?: number | null;
    item: {
      ID?: string | null;
      cditem: number;
      deitem: string | null;
      undven: string | null;
      cdgruit: number | null;
      mrcitem?: string | null;
      codcst?: string | null;
      pesolq?: unknown;
      valcmp?: unknown;
      itprodsn?: string | null;
      groupPct?: unknown;
      groupId?: string | null;
      cstRate?: unknown;
      cstId?: string | null;
      precomin: unknown;
      custo: unknown;
    };
    quantity: number;
    unitPrice: number;
    mp: 'S' | 'N';
    emisven: Date;
    vendaId: string;
    perdes: number;
    status: string;
    cdven: number | null;
    conferente?: number | null;
    companyTaxRates: {
      custoper: number;
      impstven: number;
      piscofins: number;
    };
    vendedorPct: number;
    obs?: string | null;
    idVendedor?: string | null;
  }): Prisma.t_itsvenUncheckedCreateInput {
    const minPrice =
      payload.mp === 'S'
        ? 0
        : this.roundMoney(this.toNumber(payload.item.precomin));
    const cost = this.roundDecimal(this.toNumber(payload.item.custo), 4);
    const purchaseCost = this.roundDecimal(
      this.toNumber(payload.item.valcmp),
      4,
    );
    const pesolq = this.roundDecimal(this.toNumber(payload.item.pesolq), 4);
    const lineGross = this.roundMoney(payload.unitPrice * payload.quantity);
    const lineDiscount = this.roundMoney(lineGross * (payload.perdes / 100));
    const lineNet = this.roundMoney(lineGross - lineDiscount);
    const custop = this.roundMoney(
      lineNet * (payload.companyTaxRates.custoper / 100),
    );
    const tribfed = this.roundMoney(
      lineNet * (payload.companyTaxRates.impstven / 100),
    );
    const piscofins = this.roundMoney(
      lineNet * (payload.companyTaxRates.piscofins / 100),
    );
    const icmsRate = this.roundMoney(this.toNumber(payload.item.cstRate));
    const icms = this.roundMoney(lineNet * (icmsRate / 100));
    const lucroLinha = this.roundMoney(
      lineNet - (cost + custop + tribfed + piscofins + icms),
    );
    const comissao = this.roundMoney(lineNet * (payload.vendedorPct / 100));

    return {
      empven: payload.cdemp,
      nrven_iv: payload.nrven,
      autocod_v: payload.autocodVenda ?? undefined,
      cdemp_iv: payload.cdemp,
      cditem_iv: payload.item.cditem,
      deitem_iv: (
        (payload.item.deitem ?? '').trim() || `ITEM ${payload.item.cditem}`
      ).slice(0, 60),
      unditem_iv: (payload.item.undven ?? '').trim().slice(0, 5) || undefined,
      marca_iv: (payload.item.mrcitem ?? '').trim().slice(0, 20) || undefined,
      cdgru_iv: payload.item.cdgruit ?? undefined,
      comgru_iv: this.roundMoney(this.toNumber(payload.item.groupPct)),
      precmin_iv: minPrice,
      precven_iv: payload.unitPrice,
      precpra_iv: payload.unitPrice,
      qtdesol_iv: payload.quantity,
      qtdeate_iv: 0,
      qtdeent_iv: 0,
      perdes_iv: payload.perdes,
      vdesc_iv: lineDiscount,
      codcst_iv: (payload.item.codcst ?? '').trim().slice(0, 5) || undefined,
      emisven_iv: payload.emisven,
      status_iv: payload.status,
      cdven_iv: payload.cdven ?? undefined,
      pesobr_iv: pesolq,
      entimed_sn: 'N',
      entregar: 'S',
      entregue: 'N',
      conferente:
        typeof payload.conferente === 'number'
          ? String(payload.conferente)
          : undefined,
      obs: (payload.obs ?? '').toString().trim().slice(0, 200) || undefined,
      compra_iv: purchaseCost,
      custo_iv: cost,
      empitem: payload.cdemp,
      custop,
      tribfed,
      piscofins,
      icms,
      lr: lucroLinha,
      mp: payload.mp,
      temform:
        this.normalizeFlag(payload.item.itprodsn) === FORMULA_FLAG ? 'S' : 'N',
      st: 'S',
      comissao,
      tpcom: 'V',
      picms_iv: icmsRate,
    };
  }

  private buildMovestData(payload: {
    cdemp: number;
    cditem: number;
    idItem?: string | null;
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
    preferredCdemp?: number | null,
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

      const choicesByItem = new Map<number, PedidoOnlineComboRow[]>();
      for (const comboItem of comboItems) {
        const choices =
          await this.pedidosOnlineComboRepo.listEscolhasByPedidoItemId(
            tenant,
            comboItem.id,
            tx,
          );

        if (!choices.length) {
          throw new BadRequestException(
            `Item combo ${comboItem.cditem} sem escolhas registradas.`,
          );
        }

        choicesByItem.set(comboItem.id, choices);
      }

      const allItemIds = new Set<number>();
      itens.forEach((item) => allItemIds.add(item.cditem));
      for (const choices of choicesByItem.values()) {
        choices.forEach((choice) => {
          if (choice.CDITEM_ESCOLHIDO !== null) {
            allItemIds.add(choice.CDITEM_ESCOLHIDO);
          }
        });
      }

      const itemIdList = Array.from(allItemIds);
      const itemWhere: Prisma.t_itensWhereInput = {
        cditem: { in: itemIdList },
      };

      if (typeof pedido.CDEMP === 'number') {
        itemWhere.cdemp = pedido.CDEMP;
      }

      const itemRecords = await tx.t_itens.findMany({
        where: itemWhere,
        select: {
          cdemp: true,
          cditem: true,
          deitem: true,
          undven: true,
          mrcitem: true,
          preco: true,
          precomin: true,
          custo: true,
          valcmp: true,
          pesolq: true,
          codcst: true,
          ativosn: true,
          dispven: true,
          ativoprod: true,
          negativo: true,
          isdeleted: true,
          itprodsn: true,
          combosn: true,
          cdgruit: true,
        },
      });

      if (!itemRecords.length) {
        throw new BadRequestException('Itens do pedido nao encontrados.');
      }

      const cdemp = await this.resolveCompanyId(
        tx,
        pedido,
        itemRecords,
        preferredCdemp,
      );
      const itemMap = new Map(
        itemRecords
          .filter((record) => record.cdemp === cdemp)
          .map((record) => [record.cditem, record]),
      );

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

      for (const item of itens) {
        const record = itemMap.get(item.cditem);
        if (!record) {
          throw new BadRequestException(
            `Item ${item.cditem} nao encontrado no catalogo.`,
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

        const isCombo = this.normalizeFlag(record.combosn) === COMBO_FLAG;
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

      const formulaParentKeys = Array.from(
        new Set(
          parentSnapshots
            .filter((snapshot) => !snapshot.isCombo)
            .map((snapshot) => `${snapshot.record.cdemp}:${snapshot.record.cditem}`),
        ),
      );

      await this.pedidosOnlineItensRepo.updateCalculatedValues(
        tenant,
        parentSnapshots.map((snapshot) => ({
          id: snapshot.pedidoItem.id,
          unitPrice: snapshot.unitPrice,
          total: snapshot.lineTotal,
        })),
        tx,
      );

      const formulas = formulaParentKeys.length
        ? await tx.t_formulas.findMany({
            where: {
              OR: formulaParentKeys.map((key) => {
                const [empitem, cditem] = key.split(':').map(Number);
                return { empitem, cditem };
              }),
            },
          })
        : [];

      const formulasByItem = new Map<string, typeof formulas>();
      for (const formula of formulas) {
        const formulaItemKey = `${formula.empitem}:${formula.cditem}`;
        const list = formulasByItem.get(formulaItemKey) ?? [];
        list.push(formula);
        formulasByItem.set(formulaItemKey, list);
      }

      for (const snapshot of parentSnapshots) {
        if (!snapshot.isFormula || snapshot.isCombo) continue;
        const itemKey = `${snapshot.record.cdemp}:${snapshot.record.cditem}`;
        if (!formulasByItem.get(itemKey)?.length) {
          throw new BadRequestException(
            `Produto com formula ${snapshot.record.cditem} nao possui materias primas cadastradas.`,
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
      const matprimaKeys = Array.from(
        new Set(
          formulas
            .filter(
              (formula) =>
                typeof formula.empitemmp === 'number' &&
                typeof formula.matprima === 'number',
            )
            .map((formula) => `${formula.empitemmp}:${formula.matprima}`),
        ),
      );

      const matprimaRecords =
        matprimaCodes.length || matprimaKeys.length
          ? await tx.t_itens.findMany({
              where: {
                OR: [
                  ...(matprimaCodes.length
                    ? [{ cdemp, cditem: { in: matprimaCodes } }]
                    : []),
                  ...(matprimaKeys.length
                    ? matprimaKeys.map((key) => {
                        const [empitemmp, matprima] = key.split(':').map(Number);
                        return { cdemp: empitemmp, cditem: matprima };
                      })
                    : []),
                ],
              },
              select: {
                cdemp: true,
                cditem: true,
                deitem: true,
                undven: true,
                mrcitem: true,
                precomin: true,
                custo: true,
                valcmp: true,
                pesolq: true,
                codcst: true,
                ativosn: true,
                dispven: true,
                ativoprod: true,
                isdeleted: true,
                cdgruit: true,
                itprodsn: true,
              },
            })
          : [];

      const matprimaMapByCode = new Map(
        matprimaRecords.map((record) => [`${record.cdemp}:${record.cditem}`, record]),
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
      const tipoEntregaVenda = this.resolveDeliveryType(pedido.CANAL);
      const pedidoNumero = Math.max(
        0,
        Math.floor(this.toNumber(pedido.PEDIDO)),
      );

      const [config, userRef, customerRef, rawCompanyRef] = await Promise.all([
        tx.t_config.findFirst({
          orderBy: { autocod: 'asc' },
          select: {
            codvendaavista: true,
            vendpdv: true,
            coddin: true,
          },
        }),
        tx.t_users.findFirst({
          where: { cdusu: userCode },
          select: {
            cdven: true,
            email: true,
          },
        }),
        typeof pedido.cdcli === 'number'
          ? tx.t_cli.findFirst({
              where: { cdcli: pedido.cdcli },
              select: {
                cdcli: true,
                cdemp: true,
                percomresp: true,
              },
            })
          : Promise.resolve(null),
        tx.t_emp.findFirst({
          where: { cdemp },
          select: await buildCompatibleScalarSelect(tx, 't_emp', [
            'custoper',
            'impstven',
            'piscofins',
            'taxa_entrega',
          ]),
        }),
      ]);
      const companyRef = rawCompanyRef as
        | {
            custoper?: unknown;
            impstven?: unknown;
            piscofins?: unknown;
            taxa_entrega?: unknown;
          }
        | null;

      const configuredVendCode = Math.floor(this.toNumber(config?.vendpdv));
      const userVendCode = Math.floor(this.toNumber(userRef?.cdven));
      const cdvenVenda =
        configuredVendCode > 0
          ? configuredVendCode
          : userVendCode > 0
            ? userVendCode
            : null;

      const vendorRef = cdvenVenda
        ? await tx.t_vende.findFirst({
            where: {
              cdven: cdvenVenda,
              OR: [{ cdemp }, { cdemp: null }],
            },
            select: {
              cdven: true,
              pcomven: true,
            },
            orderBy: { cdemp: 'desc' },
          })
        : null;

      const cdfpgVenda = Math.floor(this.toNumber(config?.codvendaavista));
      const cdtpgVenda = Math.floor(this.toNumber(config?.coddin));
      const [fpgtoRef, tpgtoRef] = await Promise.all([
        cdfpgVenda > 0
          ? tx.t_fpgto.findFirst({
              where: { cdfpg: cdfpgVenda },
              select: { cdfpg: true },
            })
          : Promise.resolve(null),
        cdtpgVenda > 0
          ? tx.t_tpgto.findFirst({
              where: { cdtpg: cdtpgVenda },
              select: { cdtpg: true },
            })
          : Promise.resolve(null),
      ]);

      const allTaxRecords = [...itemRecords, ...matprimaRecords];
      const groupCodes = Array.from(
        new Set(
          allTaxRecords
            .map((record) => record.cdgruit)
            .filter(
              (value): value is number =>
                typeof value === 'number' &&
                Number.isInteger(value) &&
                value > 0,
            ),
        ),
      );
      const cstCodes = Array.from(
        new Set(
          allTaxRecords
            .map((record) => (record.codcst ?? '').toString().trim())
            .filter((value) => Boolean(value)),
        ),
      );
      const [groupRows, cstRows] = await Promise.all([
        groupCodes.length
          ? tx.t_gritens.findMany({
              where: { cdgru: { in: groupCodes } },
              select: {
                cdgru: true,
                perccomgru: true,
              },
            })
          : Promise.resolve([]),
        cstCodes.length
          ? tx.t_cst.findMany({
              where: { codcst: { in: cstCodes } },
              select: {
                codcst: true,
                icms_l: true,
              },
            })
          : Promise.resolve([]),
      ]);
      const groupMap = new Map(groupRows.map((row) => [row.cdgru, row]));
      const cstMap = new Map(
        cstRows.map((row) => [row.codcst.trim().toUpperCase(), row]),
      );

      const companyTaxRates = {
        custoper: this.roundMoney(this.toNumber(companyRef?.custoper)),
        impstven: this.roundMoney(this.toNumber(companyRef?.impstven)),
        piscofins: this.roundMoney(this.toNumber(companyRef?.piscofins)),
      };

      const comissaoClientePct = this.roundMoney(
        this.toNumber(customerRef?.percomresp),
      );
      const comissaoCliente = this.roundMoney(
        totalLiquido * (comissaoClientePct / 100),
      );
      const vendedorPct = this.roundMoney(this.toNumber(vendorRef?.pcomven));
      const comissaoVendedor = this.roundMoney(
        totalLiquido * (vendedorPct / 100),
      );
      const trocoPara = this.roundMoney(this.toNumber(pedido.TrocoPara));
      const vlrAcresc = this.roundMoney(
        this.toNumber(companyRef?.taxa_entrega),
      );
      const vlrPgDinheiro = trocoPara;
      const vlrTroco = this.roundMoney(
        vlrPgDinheiro - (vlrAcresc + totalLiquido),
      );

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
          {
            pedidoNumero,
            tipoEntrega: tipoEntregaVenda,
            cdcli:
              typeof customerRef?.cdcli === 'number' ? customerRef.cdcli : null,
            cdfpg: cdfpgVenda > 0 ? cdfpgVenda : null,
            cdtpg: cdtpgVenda > 0 ? cdtpgVenda : null,
            cdven: vendorRef?.cdven ?? cdvenVenda,
            userId: null,
            userEmail: userRef?.email?.trim() ?? null,
            customerId:
              typeof customerRef?.cdcli === 'number'
                ? String(customerRef.cdcli)
                : typeof pedido.cdcli === 'number'
                  ? String(pedido.cdcli)
                  : null,
            customerCompany:
              typeof customerRef?.cdemp === 'number' ? customerRef.cdemp : null,
            fpgtoId:
              typeof fpgtoRef?.cdfpg === 'number'
                ? String(fpgtoRef.cdfpg)
                : null,
            tpgtoId:
              typeof tpgtoRef?.cdtpg === 'number'
                ? String(tpgtoRef.cdtpg)
                : null,
            vendedorId:
              typeof vendorRef?.cdven === 'number'
                ? String(vendorRef.cdven)
                : null,
            trocoPara,
            vlrAcresc,
            vlrPgDinheiro,
            vlrTroco,
            comissaoCliente,
            comissaoVendedor,
          },
        ),
      });

      const vendaNumero = this.toNumber(vendaRecord.nrven_v);

      const resolveTaxMetadata = (record: {
        cdgruit: number | null;
        codcst?: string | null;
      }) => {
        const group =
          typeof record.cdgruit === 'number'
            ? groupMap.get(record.cdgruit)
            : null;
        const cstKey = (record.codcst ?? '').toString().trim().toUpperCase();
        const cst = cstKey ? cstMap.get(cstKey) : null;
        return {
          groupPct: group?.perccomgru ?? 0,
          groupId:
            typeof group?.cdgru === 'number' ? String(group.cdgru) : null,
          cstRate: cst?.icms_l ?? 0,
          cstId: null,
        };
      };

      const formulaBackedItemIds = new Set(formulasByItem.keys());

      const parentLines: Prisma.t_itsvenUncheckedCreateInput[] =
        parentSnapshots.map((snapshot) =>
          this.buildItsvenData({
            cdemp,
            nrven,
            autocodVenda: vendaRecord.autocod_v,
            item: {
              ...snapshot.record,
              itprodsn:
                formulaBackedItemIds.has(
                  `${snapshot.record.cdemp}:${snapshot.record.cditem}`,
                )
                  ? FORMULA_FLAG
                  : snapshot.record.itprodsn,
              ...resolveTaxMetadata(snapshot.record),
            },
            quantity: snapshot.quantity,
            unitPrice: snapshot.unitPrice,
            mp: 'N',
            emisven: now,
            vendaId: String(vendaNumero),
            perdes:
              totalsSubtotal > 0
                ? this.roundMoney((desconto / totalsSubtotal) * 100)
                : 0,
            status: 'A',
            cdven: vendorRef?.cdven ?? cdvenVenda,
            conferente: null,
            companyTaxRates,
            vendedorPct,
            obs: snapshot.pedidoItem.OBS_ITEM ?? null,
            idVendedor: null,
          }),
        );

      const componentLines: Prisma.t_itsvenUncheckedCreateInput[] = [];

      for (const snapshot of parentSnapshots) {
        if (snapshot.isCombo) {
          const choices = choicesByItem.get(snapshot.pedidoItem.id) ?? [];
          const aggregated = new Map<number, number>();

          for (const choice of choices) {
            const choiceQuantity = this.toNumber(choice.QTDE);
            if (!Number.isFinite(choiceQuantity) || choiceQuantity <= 0) {
              throw new BadRequestException(
                `Quantidade invalida em escolha do combo ${snapshot.record.cditem}.`,
              );
            }

            const choiceItemId =
              typeof choice.CDITEM_ESCOLHIDO === 'number'
                ? choice.CDITEM_ESCOLHIDO
                : null;
            if (!choiceItemId) {
              throw new BadRequestException(
                `Escolha do combo ${snapshot.record.cditem} sem item selecionado.`,
              );
            }

            const quantity = this.roundDecimal(
              choiceQuantity * snapshot.quantity,
              6,
            );
            aggregated.set(
              choiceItemId,
              this.roundDecimal(
                (aggregated.get(choiceItemId) ?? 0) + quantity,
                6,
              ),
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
                autocodVenda: vendaRecord.autocod_v,
                item: {
                  ...record,
                  ...resolveTaxMetadata(record),
                },
                quantity,
                unitPrice: 0,
                mp: 'S',
                emisven: now,
                vendaId: String(vendaNumero),
                perdes:
                  totalsSubtotal > 0
                    ? this.roundMoney((desconto / totalsSubtotal) * 100)
                    : 0,
                status: 'A',
                cdven: vendorRef?.cdven ?? cdvenVenda,
                conferente: null,
                companyTaxRates,
                vendedorPct,
                obs: `Componente do combo ${snapshot.record.cditem}`,
                idVendedor:
                  typeof vendorRef?.cdven === 'number'
                    ? String(vendorRef.cdven)
                    : null,
              }),
            );
          }
        }

        const formulasForItem =
          formulasByItem.get(
            `${snapshot.record.cdemp}:${snapshot.record.cditem}`,
          ) ?? [];
        if (formulasForItem.length) {
          const aggregated = new Map<
            string,
            {
              quantity: number;
              matprimaCode: number;
              empitemmp: number | null;
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
            const matprimaCode = this.toNumber(formula.matprima);
            const empitemmp = this.toNumber(formula.empitemmp);
            const key = `${empitemmp}:${matprimaCode}`;

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
                empitemmp: Number.isFinite(empitemmp) ? empitemmp : null,
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

            const record =
              entry.empitemmp !== null
                ? matprimaMapByCode.get(
                    `${entry.empitemmp}:${entry.matprimaCode}`,
                  )
                : undefined;
            if (!record) {
              throw new BadRequestException(
                `Materia prima ${entry.matprimaCode} nao encontrada no catalogo.`,
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
                autocodVenda: vendaRecord.autocod_v,
                item: {
                  ...record,
                  ...resolveTaxMetadata(record),
                },
                quantity,
                unitPrice: 0,
                mp: 'S',
                emisven: now,
                vendaId: String(vendaNumero),
                perdes:
                  totalsSubtotal > 0
                    ? this.roundMoney((desconto / totalsSubtotal) * 100)
                    : 0,
                status: 'A',
                cdven: vendorRef?.cdven ?? cdvenVenda,
                conferente: null,
                companyTaxRates,
                vendedorPct,
                obs: `Materia prima da formula ${snapshot.record.cditem}`,
                idVendedor: null,
              }),
            );
          }
        }
      }

      await tx.t_itsven.createMany({ data: parentLines });
      if (componentLines.length) {
        await tx.t_itsven.createMany({ data: componentLines });
      }

      const allItsvenLines = [...parentLines, ...componentLines];
      const totalCustoItsven = this.roundMoney(
        allItsvenLines.reduce(
          (sum, line) => sum + this.toNumber(line.custo_iv),
          0,
        ),
      );
      const totalCustopItsven = this.roundMoney(
        allItsvenLines.reduce(
          (sum, line) => sum + this.toNumber(line.custop),
          0,
        ),
      );
      const totalTribfedItsven = this.roundMoney(
        allItsvenLines.reduce(
          (sum, line) => sum + this.toNumber(line.tribfed),
          0,
        ),
      );
      const totalPisCofinsItsven = this.roundMoney(
        allItsvenLines.reduce(
          (sum, line) => sum + this.toNumber(line.piscofins),
          0,
        ),
      );
      const totalIcmsItsven = this.roundMoney(
        allItsvenLines.reduce((sum, line) => sum + this.toNumber(line.icms), 0),
      );

      const margemVenda =
        totalLiquido > 0
          ? this.roundMoney(
              ((totalLiquido - totalCustoItsven) / totalLiquido) * 100,
            )
          : 0;
      const lrVenda =
        totalLiquido > 0
          ? this.roundMoney(
              ((totalLiquido -
                (totalCustoItsven +
                  totalCustopItsven +
                  totalTribfedItsven +
                  totalPisCofinsItsven +
                  totalIcmsItsven)) /
                totalLiquido) *
                100,
            )
          : 0;

      await tx.t_vendas.updateMany({
        where: {
          autocod_v: vendaRecord.autocod_v,
          cdemp_v: cdemp,
        },
        data: {
          margem: margemVenda,
          lr: lrVenda,
          updatedat: now,
        },
      });

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
        await applyMovestBalanceFromCreates(tx, movestLines);
      }

      const updatedPedido = await this.pedidosOnlineRepo.updateStatusConfirmado(
        tenant,
        {
          id: pedidoId,
          nrven,
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
        idPedidoOnline: updatedPedido.id,
        pedido: this.toNumber(updatedPedido.PEDIDO),
        numeroPedido: nrven,
        sinalCliente: 'Pedido Recebido',
        status: updatedPedido.STATUS,
        idVenda: vendaNumero > 0 ? vendaNumero : null,
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
        `Pedido online ${updatedPedido.id} confirmado. Venda ${vendaNumero}.`,
      );

      return plainToInstance(ConfirmOnlineOrderResponseDto, response, {
        excludeExtraneousValues: true,
      });
    });
  }
}
