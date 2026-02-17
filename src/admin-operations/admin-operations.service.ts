import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import type {
  CashFinalizeDto,
  CashFinalizeItemDto,
  CashItemSearchDto,
  CashPaymentDto,
  CloseCashierDto,
  CourierQueryDto,
  CustomersQueryDto,
  DispatchSaleDto,
  OpenCashierDto,
  SalesQueryDto,
  UpsertCourierDto,
  UpsertCustomerAddressDto,
  UpsertCustomerDto,
} from './dto/admin-operations.dto';

type SalesWhere = Prisma.t_vendasWhereInput;

@Injectable()
export class AdminOperationsService {
  private readonly defaultCompanyId = 1;

  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private trim(value: unknown, maxLen = 255): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.slice(0, maxLen);
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed =
      typeof value === 'number'
        ? value
        : Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  private toNumber(value: unknown, fallback = 0): number {
    const parsed = this.toOptionalNumber(value);
    return parsed === null ? fallback : parsed;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toDateOrNull(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private endOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private formatHour(value: Date): string {
    return value.toTimeString().slice(0, 8);
  }

  private normalizeStatus(status?: string | null): string | null {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized || null;
  }

  private normalizeUserCode(identifier: string): string {
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new BadRequestException('Usuario nao identificado no token.');
    }
    return trimmed.slice(0, 10);
  }

  private minutesSince(value?: Date | null): number | null {
    if (!value) return null;
    const diffMs = Date.now() - value.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
    return Math.floor(diffMs / 60000);
  }

  private async resolveCdemp(
    prisma: TenantClient,
    preferredCdemp?: number | null,
  ): Promise<number> {
    if (
      preferredCdemp &&
      Number.isFinite(preferredCdemp) &&
      preferredCdemp > 0
    ) {
      return preferredCdemp;
    }

    const matriz = await prisma.t_emp.findFirst({
      where: { matriz: 'S' },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    return matriz?.cdemp ?? this.defaultCompanyId;
  }

  async listCouriers(
    tenant: string,
    preferredCdemp: number | null,
    query: CourierQueryDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    const page =
      Number.isFinite(query.page) && query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;
    const limit =
      Number.isFinite(query.limit) && query.limit && query.limit > 0
        ? Math.min(Math.floor(query.limit), 200)
        : 50;

    const where: Prisma.t_sepconWhereInput = {
      cdemp,
      ...(query.ativosn?.trim()
        ? { ativosn: query.ativosn.trim().slice(0, 1).toUpperCase() }
        : {}),
      ...(query.q?.trim()
        ? {
            OR: [
              { desep: { contains: query.q.trim() } },
              { fonecel: { contains: query.q.trim() } },
              { nrocart: { contains: query.q.trim() } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.t_sepcon.findMany({
        where,
        orderBy: [{ desep: 'asc' }, { cdsep: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.t_sepcon.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items: rows,
    };
  }

  async createCourier(
    tenant: string,
    preferredCdemp: number | null,
    dto: UpsertCourierDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    return prisma.t_sepcon.create({
      data: {
        cdemp,
        desep: this.trim(dto.desep, 20) ?? undefined,
        nrocart: this.trim(dto.nrocart, 14) ?? undefined,
        categoria: this.trim(dto.categoria, 2) ?? undefined,
        vencart: dto.vencart ? new Date(dto.vencart) : undefined,
        fonecel: this.trim(dto.fonecel, 10) ?? undefined,
        tpsep: this.trim(dto.tpsep, 1) ?? undefined,
        senha: this.trim(dto.senha, 10) ?? undefined,
        cdgru: dto.cdgru ?? undefined,
        cdsub: dto.cdsub ?? undefined,
        desub: this.trim(dto.desub, 30) ?? undefined,
        ativosn: this.trim(dto.ativosn, 1) ?? 'S',
      },
    });
  }

  async updateCourier(
    tenant: string,
    preferredCdemp: number | null,
    cdsep: number,
    dto: UpsertCourierDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    const existing = await prisma.t_sepcon.findFirst({
      where: { cdemp, cdsep },
      select: { cdemp: true, cdsep: true },
    });
    if (!existing) {
      throw new NotFoundException('Entregador nao encontrado.');
    }

    await prisma.t_sepcon.updateMany({
      where: { cdemp, cdsep },
      data: {
        desep: this.trim(dto.desep, 20) ?? undefined,
        nrocart: this.trim(dto.nrocart, 14) ?? undefined,
        categoria: this.trim(dto.categoria, 2) ?? undefined,
        vencart: dto.vencart ? new Date(dto.vencart) : undefined,
        fonecel: this.trim(dto.fonecel, 10) ?? undefined,
        tpsep: this.trim(dto.tpsep, 1) ?? undefined,
        senha: this.trim(dto.senha, 10) ?? undefined,
        cdgru: dto.cdgru ?? undefined,
        cdsub: dto.cdsub ?? undefined,
        desub: this.trim(dto.desub, 30) ?? undefined,
        ativosn: this.trim(dto.ativosn, 1) ?? undefined,
      },
    });

    return prisma.t_sepcon.findFirst({
      where: { cdemp, cdsep },
    });
  }

  async removeCourier(
    tenant: string,
    preferredCdemp: number | null,
    cdsep: number,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    const deleted = await prisma.t_sepcon.deleteMany({
      where: { cdemp, cdsep },
    });
    if (!deleted.count) {
      throw new NotFoundException('Entregador nao encontrado.');
    }

    return { ok: true };
  }

  private async findSaleById(
    prisma: TenantClient,
    cdemp: number,
    saleId: string,
  ) {
    const sale = await prisma.t_vendas.findFirst({
      where: {
        ID: saleId,
        cdemp_v: cdemp,
      },
      include: {
        t_cli: {
          select: {
            id: true,
            decli: true,
            celcli: true,
            fonecli: true,
            cnpj_cpfcli: true,
            T_ENDCLI: {
              where: { ISDELETED: false },
              orderBy: { UPDATEDAT: 'desc' },
              take: 1,
              select: {
                BAIRRO: true,
                CIDADE: true,
                LOGRADOURO: true,
                NUMERO: true,
                COMPLEMENTO: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda nao encontrada.');
    }

    return sale;
  }

  private buildSalesWhere(cdemp: number, query: SalesQueryDto): SalesWhere {
    const and: Prisma.t_vendasWhereInput[] = [
      {
        isdeleted: false,
      },
    ];

    const status = this.normalizeStatus(query.status);
    if (status && status !== 'ALL') {
      and.push({ status_v: status });
    }

    if (query.nrven !== undefined) {
      and.push({ nrven_v: query.nrven });
    }

    const fromDate = this.toDateOrNull(query.from);
    const toDate = this.toDateOrNull(query.to);
    if (fromDate || toDate) {
      and.push({
        emisven_v: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: this.endOfDay(toDate) } : {}),
        },
      });
    }

    if (query.q?.trim()) {
      const term = query.q.trim();
      and.push({
        OR: [
          { nrpedcli_v: { contains: term } },
          { t_cli: { decli: { contains: term } } },
        ],
      });
    }

    if (query.bairro?.trim() || query.cidade?.trim()) {
      and.push({
        t_cli: {
          T_ENDCLI: {
            some: {
              ISDELETED: false,
              ...(query.bairro?.trim()
                ? { BAIRRO: { contains: query.bairro.trim() } }
                : {}),
              ...(query.cidade?.trim()
                ? { CIDADE: { contains: query.cidade.trim() } }
                : {}),
            },
          },
        },
      });
    }

    return {
      cdemp_v: cdemp,
      AND: and,
    };
  }

  async listSales(
    tenant: string,
    preferredCdemp: number | null,
    query: SalesQueryDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    const page =
      Number.isFinite(query.page) && query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;
    const limit =
      Number.isFinite(query.limit) && query.limit && query.limit > 0
        ? Math.min(Math.floor(query.limit), 200)
        : 40;

    const where = this.buildSalesWhere(cdemp, query);

    const [rows, total, summaryByStatus, aggregateTotal] = await Promise.all([
      prisma.t_vendas.findMany({
        where,
        orderBy: [{ emisven_v: 'desc' }, { nrven_v: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ID: true,
          nrven_v: true,
          emisven_v: true,
          horaven_v: true,
          totpro_v: true,
          pdesc_v: true,
          totven_v: true,
          status_v: true,
          dtsainf_v: true,
          hrsainf_v: true,
          codconf_v: true,
          vlfrete_v: true,
          vlrtroco: true,
          t_cli: {
            select: {
              decli: true,
              T_ENDCLI: {
                where: { ISDELETED: false },
                orderBy: { UPDATEDAT: 'desc' },
                take: 1,
                select: { BAIRRO: true, CIDADE: true },
              },
            },
          },
        },
      }),
      prisma.t_vendas.count({ where }),
      prisma.t_vendas.groupBy({
        by: ['status_v'],
        where,
        _count: { _all: true },
        _sum: { totven_v: true },
      }),
      prisma.t_vendas.aggregate({
        where,
        _count: { _all: true },
        _sum: { totven_v: true, totpro_v: true },
      }),
    ]);

    const driverCodes = Array.from(
      new Set(
        rows
          .map((row) => row.codconf_v)
          .filter((value): value is number => typeof value === 'number'),
      ),
    );
    const drivers = driverCodes.length
      ? await prisma.t_sepcon.findMany({
          where: {
            cdemp,
            cdsep: { in: driverCodes },
          },
          select: {
            cdsep: true,
            desep: true,
          },
        })
      : [];
    const driverMap = new Map(
      drivers.map((driver) => [driver.cdsep, driver.desep ?? null]),
    );

    const totalsByStatus = {
      E: { count: 0, total: 0 },
      A: { count: 0, total: 0 },
      C: { count: 0, total: 0 },
    };
    for (const entry of summaryByStatus) {
      const status = this.normalizeStatus(entry.status_v);
      if (!status || !(status in totalsByStatus)) continue;
      totalsByStatus[status as 'E' | 'A' | 'C'] = {
        count: entry._count._all,
        total: this.toNumber(entry._sum.totven_v),
      };
    }

    return {
      page,
      limit,
      total,
      summary: {
        totalCount: aggregateTotal._count._all,
        totalValue: this.toNumber(aggregateTotal._sum.totven_v),
        totalProductsValue: this.toNumber(aggregateTotal._sum.totpro_v),
        efetivados: totalsByStatus.E,
        emAberto: totalsByStatus.A,
        cancelados: totalsByStatus.C,
      },
      items: rows.map((row) => {
        const address = row.t_cli?.T_ENDCLI?.[0];
        const dtPedido = row.emisven_v ?? null;
        const dtSaida = row.dtsainf_v ?? null;
        const minutosDesdeSaida = this.minutesSince(dtSaida);

        return {
          id: row.ID,
          pedido: row.nrven_v,
          data: dtPedido,
          horarioPedido: row.horaven_v ?? null,
          cliente: row.t_cli?.decli ?? null,
          totalProduto: this.toNumber(row.totpro_v),
          descontoPerc: this.toNumber(row.pdesc_v),
          totalVenda: this.toNumber(row.totven_v),
          status: row.status_v ?? null,
          bairro: address?.BAIRRO ?? null,
          cidade: address?.CIDADE ?? null,
          horarioSaidaEntrega: row.hrsainf_v ?? null,
          dataSaidaEntrega: dtSaida,
          minutosDesdeSaida,
          motorista: row.codconf_v
            ? {
                codigo: row.codconf_v,
                nome: driverMap.get(row.codconf_v) ?? null,
              }
            : null,
          taxaEntrega: this.toNumber(row.vlfrete_v),
          troco: this.toNumber(row.vlrtroco),
        };
      }),
    };
  }

  async listPrinters(tenant: string, preferredCdemp: number | null) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    return prisma.t_printers.findMany({
      where: { cdemp },
      orderBy: [{ descricao: 'asc' }, { autocod: 'asc' }],
      select: {
        autocod: true,
        cdemp: true,
        descricao: true,
        local: true,
      },
    });
  }

  async getSaleDetails(
    tenant: string,
    preferredCdemp: number | null,
    saleId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const sale = await this.findSaleById(prisma, cdemp, saleId);

    const [items, driver] = await Promise.all([
      prisma.t_itsven.findMany({
        where: {
          empven: cdemp,
          nrven_iv: sale.nrven_v,
        },
        orderBy: [{ registro: 'asc' }],
        select: {
          registro: true,
          cditem_iv: true,
          deitem_iv: true,
          qtdesol_iv: true,
          precven_iv: true,
          mp: true,
        },
      }),
      sale.codconf_v
        ? prisma.t_sepcon.findFirst({
            where: { cdemp, cdsep: sale.codconf_v },
            select: { cdsep: true, desep: true },
          })
        : null,
    ]);

    return {
      id: sale.ID,
      pedido: sale.nrven_v,
      data: sale.emisven_v ?? null,
      horarioPedido: sale.horaven_v ?? null,
      horarioSaidaEntrega: sale.hrsainf_v ?? null,
      dataSaidaEntrega: sale.dtsainf_v ?? null,
      minutosDesdeSaida: this.minutesSince(sale.dtsainf_v),
      totalProduto: this.toNumber(sale.totpro_v),
      descontoPerc: this.toNumber(sale.pdesc_v),
      totalVenda: this.toNumber(sale.totven_v),
      status: sale.status_v ?? null,
      taxaEntrega: this.toNumber(sale.vlfrete_v),
      troco: this.toNumber(sale.vlrtroco),
      cliente: sale.t_cli
        ? {
            id: sale.t_cli.id,
            nome: sale.t_cli.decli ?? null,
            telefone: sale.t_cli.celcli ?? sale.t_cli.fonecli ?? null,
            cpfCnpj: sale.t_cli.cnpj_cpfcli ?? null,
            endereco: sale.t_cli.T_ENDCLI?.[0]
              ? {
                  bairro: sale.t_cli.T_ENDCLI[0].BAIRRO ?? null,
                  cidade: sale.t_cli.T_ENDCLI[0].CIDADE ?? null,
                  logradouro: sale.t_cli.T_ENDCLI[0].LOGRADOURO ?? null,
                  numero: sale.t_cli.T_ENDCLI[0].NUMERO ?? null,
                  complemento: sale.t_cli.T_ENDCLI[0].COMPLEMENTO ?? null,
                }
              : null,
          }
        : null,
      motorista: driver
        ? { codigo: driver.cdsep, nome: driver.desep ?? null }
        : null,
      itens: items.map((item) => ({
        registro: item.registro,
        cditem: item.cditem_iv,
        descricao: item.deitem_iv,
        quantidade: this.toNumber(item.qtdesol_iv),
        valorUnitario: this.toNumber(item.precven_iv),
        mp: (item.mp ?? 'N').trim().toUpperCase(),
      })),
    };
  }

  private fitText(
    value: string,
    width: number,
    align: 'left' | 'right' = 'left',
  ) {
    const raw = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sliced = raw.slice(0, width);
    if (align === 'right') return sliced.padStart(width, ' ');
    return sliced.padEnd(width, ' ');
  }

  private buildReceipt40(payload: {
    companyName: string;
    orderNumber: number;
    date: Date;
    customerName: string | null;
    driverName: string | null;
    fee: number;
    changeFor: number;
    total: number;
    items: Array<{
      description: string;
      qty: number;
      unitPrice: number;
      total: number;
      mp: string;
    }>;
  }): string {
    const width = 40;
    const separator = '-'.repeat(width);
    const center = (value: string) => {
      const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .slice(0, width);
      const pad = Math.max(0, Math.floor((width - normalized.length) / 2));
      return `${' '.repeat(pad)}${normalized}`;
    };

    const money = (value: number) =>
      value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const lines: string[] = [];
    lines.push(center(payload.companyName || 'LOJA'));
    lines.push(
      center(`PEDIDO ${String(payload.orderNumber).padStart(6, '0')}`),
    );
    lines.push(
      `${this.fitText(
        payload.date.toLocaleDateString('pt-BR'),
        10,
      )} ${this.fitText(payload.date.toLocaleTimeString('pt-BR'), 8)}`,
    );
    lines.push(separator);
    lines.push(`Cliente: ${payload.customerName ?? 'CONSUMIDOR FINAL'}`);
    if (payload.driverName) {
      lines.push(`Motorista: ${payload.driverName}`);
    }
    lines.push(separator);
    lines.push('ITENS');
    for (const item of payload.items) {
      if (item.mp === 'S') continue;
      lines.push(this.fitText(item.description, width));
      lines.push(
        `${this.fitText(
          `${item.qty.toFixed(3).replace('.', ',')} x ${money(item.unitPrice)}`,
          28,
        )}${this.fitText(money(item.total), 12, 'right')}`,
      );
    }
    lines.push(separator);
    lines.push(
      `${this.fitText('Taxa entrega', 28)}${this.fitText(
        money(payload.fee),
        12,
        'right',
      )}`,
    );
    lines.push(
      `${this.fitText('Troco para', 28)}${this.fitText(
        money(payload.changeFor),
        12,
        'right',
      )}`,
    );
    lines.push(
      `${this.fitText('TOTAL', 28)}${this.fitText(
        money(payload.total),
        12,
        'right',
      )}`,
    );
    lines.push(separator);
    lines.push(center('OBRIGADO PELA PREFERENCIA'));
    lines.push('');
    lines.push('');
    lines.push('');
    return lines.join('\r\n');
  }

  private async sendToPrinter(printerLocal: string, content: string) {
    const target = printerLocal.trim();
    if (!target) {
      throw new BadRequestException(
        'Impressora sem caminho de rede configurado.',
      );
    }

    const hasExtension = /\.[a-z0-9]{2,5}$/i.test(target);
    const outputPath = hasExtension
      ? target
      : path.win32.join(target, `pedido-${Date.now()}.txt`);

    await writeFile(outputPath, content, { encoding: 'latin1' });
    return outputPath;
  }

  async dispatchSale(
    tenant: string,
    preferredCdemp: number | null,
    saleId: string,
    userIdentifier: string,
    dto: DispatchSaleDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const sale = await this.findSaleById(prisma, cdemp, saleId);

    const now = new Date();
    const updateData: Prisma.t_vendasUpdateManyMutationInput = {
      codconf_v: dto.codconfV ?? sale.codconf_v ?? undefined,
      vlfrete_v: dto.deliveryFee ?? sale.vlfrete_v ?? undefined,
      vlrtroco: dto.changeFor ?? sale.vlrtroco ?? undefined,
      dtsainf_v: now,
      hrsainf_v: this.formatHour(now),
      dtstat_v: now,
      codusu_v: this.normalizeUserCode(userIdentifier),
      updatedat: now,
    };

    await prisma.t_vendas.updateMany({
      where: { ID: saleId, cdemp_v: cdemp },
      data: updateData,
    });

    const refreshed = await this.findSaleById(prisma, cdemp, saleId);
    const [itsven, driver] = await Promise.all([
      prisma.t_itsven.findMany({
        where: {
          empven: cdemp,
          nrven_iv: refreshed.nrven_v,
        },
        orderBy: [{ registro: 'asc' }],
        select: {
          deitem_iv: true,
          qtdesol_iv: true,
          precven_iv: true,
          mp: true,
        },
      }),
      refreshed.codconf_v
        ? prisma.t_sepcon.findFirst({
            where: { cdemp, cdsep: refreshed.codconf_v },
            select: { desep: true, cdsep: true },
          })
        : null,
    ]);

    let printInfo: {
      printer: { autocod: number; descricao: string | null; local: string };
      outputPath: string | null;
      warning: string | null;
      receiptText: string;
    } | null = null;

    if (dto.printerAutocod !== undefined) {
      const printer = await prisma.t_printers.findFirst({
        where: { cdemp, autocod: dto.printerAutocod },
        select: { autocod: true, descricao: true, local: true },
      });

      if (!printer) {
        throw new NotFoundException(
          'Impressora nao encontrada para a empresa.',
        );
      }

      const company = await prisma.t_emp.findFirst({
        where: { cdemp },
        select: { deemp: true, fantemp: true },
      });

      const receiptText = this.buildReceipt40({
        companyName: company?.fantemp ?? company?.deemp ?? 'LOJA',
        orderNumber: refreshed.nrven_v,
        date: now,
        customerName: refreshed.t_cli?.decli ?? null,
        driverName: driver?.desep ?? null,
        fee: this.toNumber(refreshed.vlfrete_v),
        changeFor: this.toNumber(refreshed.vlrtroco),
        total: this.toNumber(refreshed.totven_v),
        items: itsven.map((item) => ({
          description: item.deitem_iv,
          qty: this.toNumber(item.qtdesol_iv),
          unitPrice: this.toNumber(item.precven_iv),
          total: this.roundMoney(
            this.toNumber(item.qtdesol_iv) * this.toNumber(item.precven_iv),
          ),
          mp: (item.mp ?? 'N').trim().toUpperCase(),
        })),
      });

      let outputPath: string | null = null;
      let warning: string | null = null;
      try {
        outputPath = await this.sendToPrinter(printer.local, receiptText);
      } catch (error: any) {
        warning = `Falha ao enviar para impressora: ${error?.message ?? String(error)}`;
      }

      printInfo = {
        printer,
        outputPath,
        warning,
        receiptText,
      };
    }

    return {
      id: refreshed.ID,
      pedido: refreshed.nrven_v,
      horarioSaidaEntrega: refreshed.hrsainf_v,
      dataSaidaEntrega: refreshed.dtsainf_v,
      minutosDesdeSaida: this.minutesSince(refreshed.dtsainf_v),
      motorista: driver
        ? { codigo: driver.cdsep, nome: driver.desep ?? null }
        : null,
      taxaEntrega: this.toNumber(refreshed.vlfrete_v),
      troco: this.toNumber(refreshed.vlrtroco),
      print: printInfo,
    };
  }

  private async ensureCustomerBelongsToCompany(
    prisma: TenantClient,
    cdemp: number,
    customerId: string,
  ) {
    const customer = await prisma.t_cli.findFirst({
      where: {
        id: customerId,
        cdemp,
      },
      select: {
        id: true,
        cdemp: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado para a empresa.');
    }
    return customer;
  }

  async listCustomers(
    tenant: string,
    preferredCdemp: number | null,
    query: CustomersQueryDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const page =
      Number.isFinite(query.page) && query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;
    const limit =
      Number.isFinite(query.limit) && query.limit && query.limit > 0
        ? Math.min(Math.floor(query.limit), 200)
        : 40;

    const and: Prisma.t_cliWhereInput[] = [
      {
        OR: [{ isdeleted: false }, { isdeleted: null }],
      },
    ];

    if (query.q?.trim()) {
      const term = query.q.trim();
      and.push({
        OR: [
          { decli: { contains: term } },
          { celcli: { contains: term } },
          { fonecli: { contains: term } },
          { cnpj_cpfcli: { contains: term } },
          { emailcli: { contains: term } },
        ],
      });
    }

    const where: Prisma.t_cliWhereInput = {
      cdemp,
      AND: and,
    };

    const [rows, total] = await Promise.all([
      prisma.t_cli.findMany({
        where,
        orderBy: [{ decli: 'asc' }, { cdcli: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          cdemp: true,
          cdcli: true,
          decli: true,
          fantcli: true,
          celcli: true,
          fonecli: true,
          emailcli: true,
          cnpj_cpfcli: true,
          tipocli: true,
          ativocli: true,
          createdat: true,
          updatedat: true,
        },
      }),
      prisma.t_cli.count({ where }),
    ]);

    const customerIds = rows.map((row) => row.id);
    const addresses = customerIds.length
      ? await prisma.t_ENDCLI.groupBy({
          by: ['ID_CLIENTE'],
          where: {
            ID_CLIENTE: { in: customerIds },
            ISDELETED: false,
          },
          _count: { _all: true },
        })
      : [];
    const addressCountMap = new Map(
      addresses.map(
        (entry: { ID_CLIENTE: string; _count: { _all: number } }) => [
          entry.ID_CLIENTE,
          entry._count._all,
        ],
      ),
    );

    return {
      page,
      limit,
      total,
      items: rows.map((row) => ({
        ...row,
        addressCount: addressCountMap.get(row.id) ?? 0,
      })),
    };
  }

  async getCustomer(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    const customer = await prisma.t_cli.findUnique({
      where: { id: customerId },
      include: {
        T_ENDCLI: {
          where: { ISDELETED: false },
          orderBy: { UPDATEDAT: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return customer;
  }

  async createCustomer(
    tenant: string,
    preferredCdemp: number | null,
    dto: UpsertCustomerDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    return prisma.t_cli.create({
      data: {
        cdemp,
        decli: this.trim(dto.decli, 60) ?? undefined,
        fantcli: this.trim(dto.fantcli, 60) ?? undefined,
        dddcli: this.trim(dto.dddcli, 3) ?? undefined,
        fonecli: this.trim(dto.fonecli, 10) ?? undefined,
        celcli: this.trim(dto.celcli, 10) ?? undefined,
        emailcli: this.trim(dto.emailcli, 60) ?? undefined,
        cnpj_cpfcli: this.trim(dto.cnpjCpfcli, 18) ?? undefined,
        tipocli: this.trim(dto.tipocli, 1) ?? 'F',
        ativocli: this.trim(dto.ativocli, 1) ?? 'S',
      },
    });
  }

  async updateCustomer(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
    dto: UpsertCustomerDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    return prisma.t_cli.update({
      where: { id: customerId },
      data: {
        decli: this.trim(dto.decli, 60) ?? undefined,
        fantcli: this.trim(dto.fantcli, 60) ?? undefined,
        dddcli: this.trim(dto.dddcli, 3) ?? undefined,
        fonecli: this.trim(dto.fonecli, 10) ?? undefined,
        celcli: this.trim(dto.celcli, 10) ?? undefined,
        emailcli: this.trim(dto.emailcli, 60) ?? undefined,
        cnpj_cpfcli: this.trim(dto.cnpjCpfcli, 18) ?? undefined,
        tipocli: this.trim(dto.tipocli, 1) ?? undefined,
        ativocli: this.trim(dto.ativocli, 1) ?? undefined,
        updatedat: new Date(),
      },
    });
  }

  async removeCustomer(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    await prisma.t_cli.update({
      where: { id: customerId },
      data: {
        isdeleted: true,
        ativocli: 'N',
        updatedat: new Date(),
      },
    });
    return { ok: true };
  }

  async listCustomerAddresses(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    return prisma.t_ENDCLI.findMany({
      where: {
        ID_CLIENTE: customerId,
        ISDELETED: false,
      },
      orderBy: [{ UPDATEDAT: 'desc' }, { CREATEDAT: 'desc' }],
    });
  }

  async createCustomerAddress(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
    userIdentifier: string,
    dto: UpsertCustomerAddressDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    return prisma.t_ENDCLI.create({
      data: {
        ID_CLIENTE: customerId,
        CEP: this.trim(dto.cep, 10) ?? undefined,
        LOGRADOURO: this.trim(dto.logradouro, 100) ?? undefined,
        NUMERO: this.trim(dto.numero, 20) ?? undefined,
        BAIRRO: this.trim(dto.bairro, 60) ?? undefined,
        CIDADE: this.trim(dto.cidade, 60) ?? undefined,
        UF: this.trim(dto.uf, 2) ?? undefined,
        COMPLEMENTO: this.trim(dto.complemento, 100) ?? undefined,
        PONTO_REFERENCIA: this.trim(dto.pontoReferencia, 255) ?? undefined,
        TIPO_LOCAL: this.trim(dto.tipoLocal, 20) ?? undefined,
        INSTRUCOES_ENTREGA: this.trim(dto.instrucoesEntrega, 1000) ?? undefined,
        LATITUDE: dto.latitude ?? undefined,
        LONGITUDE: dto.longitude ?? undefined,
        CDUSU: this.normalizeUserCode(userIdentifier),
        TIPO_ENDERECO: this.trim(dto.tipoEndereco, 3) ?? undefined,
      },
    });
  }

  async updateCustomerAddress(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
    addressId: string,
    userIdentifier: string,
    dto: UpsertCustomerAddressDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    const existing = await prisma.t_ENDCLI.findFirst({
      where: {
        ID: addressId,
        ID_CLIENTE: customerId,
        ISDELETED: false,
      },
      select: { ID: true },
    });
    if (!existing) {
      throw new NotFoundException('Endereco nao encontrado para o cliente.');
    }

    return prisma.t_ENDCLI.update({
      where: { ID: addressId },
      data: {
        CEP: this.trim(dto.cep, 10) ?? undefined,
        LOGRADOURO: this.trim(dto.logradouro, 100) ?? undefined,
        NUMERO: this.trim(dto.numero, 20) ?? undefined,
        BAIRRO: this.trim(dto.bairro, 60) ?? undefined,
        CIDADE: this.trim(dto.cidade, 60) ?? undefined,
        UF: this.trim(dto.uf, 2) ?? undefined,
        COMPLEMENTO: this.trim(dto.complemento, 100) ?? undefined,
        PONTO_REFERENCIA: this.trim(dto.pontoReferencia, 255) ?? undefined,
        TIPO_LOCAL: this.trim(dto.tipoLocal, 20) ?? undefined,
        INSTRUCOES_ENTREGA: this.trim(dto.instrucoesEntrega, 1000) ?? undefined,
        LATITUDE: dto.latitude ?? undefined,
        LONGITUDE: dto.longitude ?? undefined,
        TIPO_ENDERECO: this.trim(dto.tipoEndereco, 3) ?? undefined,
        CDUSU: this.normalizeUserCode(userIdentifier),
        UPDATEDAT: new Date(),
      },
    });
  }

  async removeCustomerAddress(
    tenant: string,
    preferredCdemp: number | null,
    customerId: string,
    addressId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    await this.ensureCustomerBelongsToCompany(prisma, cdemp, customerId);

    const updated = await prisma.t_ENDCLI.updateMany({
      where: {
        ID: addressId,
        ID_CLIENTE: customerId,
        ISDELETED: false,
      },
      data: {
        ISDELETED: true,
        UPDATEDAT: new Date(),
      },
    });
    if (!updated.count) {
      throw new NotFoundException('Endereco nao encontrado para o cliente.');
    }
    return { ok: true };
  }

  private async getOpenCashier(
    prisma: TenantClient,
    cdemp: number,
    userCode: string,
  ) {
    return prisma.t_cxabe.findFirst({
      where: {
        codemp: cdemp,
        codusu: userCode,
        datfec: null,
      },
      orderBy: [{ codabe: 'desc' }],
    });
  }

  async getCashierStatus(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);
    const openCashier = await this.getOpenCashier(prisma, cdemp, userCode);

    if (!openCashier) {
      return { status: 'NEEDS_OPEN', caixa: null };
    }

    const openedAt = openCashier.databe ?? new Date();
    const openedDay = new Date(openedAt);
    openedDay.setHours(0, 0, 0, 0);
    const today = this.startOfToday();

    if (openedDay < today) {
      return {
        status: 'PREVIOUS_DAY_OPEN',
        caixa: openCashier,
      };
    }

    return {
      status: 'OPEN',
      caixa: openCashier,
    };
  }

  async openCashier(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    dto: OpenCashierDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);
    const now = new Date();
    const existing = await this.getOpenCashier(prisma, cdemp, userCode);

    if (existing) {
      const openedDay = new Date(existing.databe ?? now);
      openedDay.setHours(0, 0, 0, 0);
      const today = this.startOfToday();

      if (openedDay < today) {
        if (!dto.forceClosePrevious) {
          throw new ConflictException(
            'Existe caixa aberto de data anterior. Feche-o antes de abrir um novo.',
          );
        }
        await prisma.t_cxabe.updateMany({
          where: {
            codemp: cdemp,
            codabe: existing.codabe,
          },
          data: {
            datfec: now,
            salfcx1:
              dto.openingBalance !== undefined ? dto.openingBalance : undefined,
            dtaltcx: now,
          },
        });
      } else {
        return { status: 'OPEN', caixa: existing, reused: true };
      }
    }

    const created = await prisma.t_cxabe.create({
      data: {
        codemp: cdemp,
        codusu: userCode,
        databe: now,
        salabe: dto.openingBalance,
        salfcx1: dto.openingBalance,
        dtaltcx: now,
      },
    });

    return { status: 'OPEN', caixa: created, reused: false };
  }

  async closeCashier(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    dto: CloseCashierDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);

    const openCashier = dto.codabe
      ? await prisma.t_cxabe.findFirst({
          where: {
            codemp: cdemp,
            codabe: dto.codabe,
            codusu: userCode,
            datfec: null,
          },
        })
      : await this.getOpenCashier(prisma, cdemp, userCode);

    if (!openCashier) {
      throw new NotFoundException('Nao existe caixa aberto para o usuario.');
    }

    const now = new Date();
    await prisma.t_cxabe.updateMany({
      where: {
        codemp: cdemp,
        codabe: openCashier.codabe,
      },
      data: {
        datfec: now,
        salfcx1:
          dto.closingBalance !== undefined ? dto.closingBalance : undefined,
        dtaltcx: now,
      },
    });

    return {
      status: 'CLOSED',
      codabe: openCashier.codabe,
      codemp: cdemp,
      datfec: now,
    };
  }

  async listCashierPaymentMethods(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    return prisma.t_tpgto.findMany({
      where: {
        OR: [{ ativosn: 'S' }, { ativosn: null }],
      },
      orderBy: [{ detpg: 'asc' }],
      select: {
        cdtpg: true,
        detpg: true,
        tipo: true,
        PIX: true,
        TEF: true,
        quitpg: true,
      },
    });
  }

  async searchCashierItems(
    tenant: string,
    preferredCdemp: number | null,
    query: CashItemSearchDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const term = query.term.trim();
    if (!term) {
      return [];
    }

    const limit =
      Number.isFinite(query.limit) && query.limit && query.limit > 0
        ? Math.min(Math.floor(query.limit), 100)
        : 30;
    const numeric = Number(term);
    const isNumeric = Number.isFinite(numeric);

    const rows = await prisma.t_itens.findMany({
      where: {
        cdemp,
        ativosn: 'S',
        OR: [
          ...(isNumeric ? [{ cditem: Math.floor(numeric) }] : []),
          { barcodeit: { contains: term } },
          { deitem: { contains: term } },
        ],
      },
      orderBy: [{ deitem: 'asc' }],
      take: limit,
      select: {
        ID: true,
        cditem: true,
        deitem: true,
        undven: true,
        barcodeit: true,
        preco: true,
        locfotitem: true,
        t_imgitens: {
          select: {
            URL: true,
          },
          orderBy: { AUTOCOD: 'asc' },
          take: 1,
        },
      },
    });

    return rows.map((row) => ({
      id: row.ID,
      cditem: row.cditem,
      descricao: row.deitem,
      unidade: row.undven,
      codigoBarras: row.barcodeit,
      preco: this.toNumber(row.preco),
      imagem:
        row.t_imgitens?.[0]?.URL?.trim() || row.locfotitem?.trim() || null,
    }));
  }

  async listOpenSalesForCashier(tenant: string, preferredCdemp: number | null) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const rows = await prisma.t_vendas.findMany({
      where: {
        cdemp_v: cdemp,
        status_v: 'A',
        isdeleted: false,
      },
      orderBy: [{ emisven_v: 'desc' }, { nrven_v: 'desc' }],
      select: {
        ID: true,
        nrven_v: true,
        emisven_v: true,
        totven_v: true,
        t_cli: {
          select: {
            decli: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.ID,
      pedido: row.nrven_v,
      data: row.emisven_v,
      cliente: row.t_cli?.decli ?? null,
      totalVenda: this.toNumber(row.totven_v),
    }));
  }

  async getOpenSaleForCashier(
    tenant: string,
    preferredCdemp: number | null,
    saleId: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const sale = await prisma.t_vendas.findFirst({
      where: {
        ID: saleId,
        cdemp_v: cdemp,
        status_v: 'A',
      },
      include: {
        t_cli: {
          select: {
            id: true,
            decli: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda em aberto nao encontrada.');
    }

    const items = await prisma.t_itsven.findMany({
      where: {
        empven: cdemp,
        nrven_iv: sale.nrven_v,
        OR: [{ mp: 'N' }, { mp: null }],
      },
      orderBy: [{ registro: 'asc' }],
      select: {
        registro: true,
        ID_ITEM: true,
        cditem_iv: true,
        deitem_iv: true,
        qtdesol_iv: true,
        precven_iv: true,
      },
    });

    return {
      id: sale.ID,
      pedido: sale.nrven_v,
      data: sale.emisven_v,
      cliente: sale.t_cli
        ? { id: sale.t_cli.id, nome: sale.t_cli.decli ?? null }
        : null,
      totalVenda: this.toNumber(sale.totven_v),
      items: items.map((item) => ({
        registro: item.registro,
        idItem: item.ID_ITEM,
        cditem: item.cditem_iv,
        descricao: item.deitem_iv,
        quantidade: this.toNumber(item.qtdesol_iv),
        valorUnitario: this.toNumber(item.precven_iv),
      })),
    };
  }

  private async getNextSaleNumber(
    prisma: TenantClient | Prisma.TransactionClient,
    cdemp: number,
  ) {
    const result = await prisma.t_vendas.aggregate({
      where: { cdemp_v: cdemp },
      _max: { nrven_v: true },
    });
    return (result._max.nrven_v ?? 0) + 1;
  }

  private mapPaymentRows(
    cdemp: number,
    userCode: string,
    cashId: number,
    nrven: number,
    now: Date,
    payments: CashPaymentDto[],
  ): Prisma.t_pgcaixaCreateManyInput[] {
    return payments.map((payment) => ({
      cdemp,
      cdusu: userCode,
      nrven,
      cdtpg: payment.cdtpg,
      nrcx: cashId,
      valor: this.roundMoney(payment.value),
      empven: cdemp,
      cdfpg: payment.cdfpg ?? null,
      data: now,
      CreatedAt: now,
      UpdatedAt: now,
    }));
  }

  private buildItsvenLine(payload: {
    cdemp: number;
    nrven: number;
    emisven: Date;
    vendaId: string;
    item: {
      ID: string | null;
      cditem: number;
      deitem: string | null;
      undven: string | null;
      cdgruit: number | null;
      precomin: unknown;
      custo: unknown;
    };
    quantity: number;
    unitPrice: number;
  }): Prisma.t_itsvenUncheckedCreateInput {
    const cost = this.toNumber(payload.item.custo);
    return {
      empven: payload.cdemp,
      nrven_iv: payload.nrven,
      cdemp_iv: payload.cdemp,
      cditem_iv: payload.item.cditem,
      deitem_iv: payload.item.deitem ?? `ITEM ${payload.item.cditem}`,
      unditem_iv: payload.item.undven ?? undefined,
      cdgru_iv: payload.item.cdgruit ?? undefined,
      precmin_iv: this.toNumber(payload.item.precomin),
      precven_iv: payload.unitPrice,
      precpra_iv: payload.unitPrice,
      qtdesol_iv: payload.quantity,
      perdes_iv: 0,
      emisven_iv: payload.emisven,
      compra_iv: cost,
      custo_iv: cost,
      mp: 'N',
      ID_ITEM: payload.item.ID ?? undefined,
      ID_VENDA: payload.vendaId,
    };
  }

  private buildMovestLine(payload: {
    cdemp: number;
    nrven: number;
    userCode: string;
    now: Date;
    itemCode: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    cost: number;
  }): Prisma.t_movestCreateManyInput {
    return {
      cdemp: payload.cdemp,
      data: payload.now,
      datadoc: payload.now,
      datalan: payload.now,
      numdoc: payload.nrven,
      especie: 'V',
      cditem: payload.itemCode,
      qtde: payload.quantity,
      valor: payload.lineTotal,
      preco: payload.unitPrice,
      custo: payload.cost,
      st: 'S',
      codusu: payload.userCode,
      empitem: payload.cdemp,
      empven: payload.cdemp,
      empmov: payload.cdemp,
      createdat: payload.now,
      updatedat: payload.now,
      isdeleted: false,
    };
  }

  private normalizeFinalizeItems(
    items: CashFinalizeItemDto[] | undefined,
  ): CashFinalizeItemDto[] {
    if (!items?.length) return [];
    return items
      .map((item) => ({
        ...item,
        idItem: item.idItem.trim(),
        quantity: this.toNumber(item.quantity),
        unitPrice:
          item.unitPrice !== undefined
            ? this.toNumber(item.unitPrice)
            : undefined,
      }))
      .filter((item) => item.idItem && item.quantity > 0);
  }

  async finalizeCashierSale(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    dto: CashFinalizeDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);
    const now = new Date();
    const paymentTotal = this.roundMoney(
      (dto.payments ?? []).reduce(
        (sum, payment) => sum + this.toNumber(payment.value),
        0,
      ),
    );
    if (paymentTotal <= 0) {
      throw new BadRequestException('Informe ao menos um pagamento valido.');
    }

    const openCashier = await this.getOpenCashier(prisma, cdemp, userCode);
    if (!openCashier) {
      throw new ConflictException('Nao existe caixa aberto para o usuario.');
    }

    return prisma.$transaction(async (tx) => {
      if (dto.importedSaleId) {
        const sale = await tx.t_vendas.findFirst({
          where: {
            ID: dto.importedSaleId,
            cdemp_v: cdemp,
            status_v: 'A',
          },
          select: {
            ID: true,
            nrven_v: true,
            totven_v: true,
          },
        });

        if (!sale) {
          throw new NotFoundException(
            'Venda em aberto nao encontrada para importar.',
          );
        }

        const saleTotal = this.roundMoney(this.toNumber(sale.totven_v));
        if (paymentTotal < saleTotal) {
          throw new BadRequestException(
            'Valor pago insuficiente para efetivar a venda importada.',
          );
        }

        await tx.t_vendas.updateMany({
          where: {
            ID: dto.importedSaleId,
            cdemp_v: cdemp,
          },
          data: {
            status_v: 'E',
            dtstat_v: now,
            dtefetiv: now,
            codcx: openCashier.codabe,
            cdtpg_v: dto.payments[0]?.cdtpg ?? undefined,
            vlrtroco: dto.changeFor ?? undefined,
            updatedat: now,
          },
        });

        await tx.t_pgcaixa.createMany({
          data: this.mapPaymentRows(
            cdemp,
            userCode,
            openCashier.codabe,
            sale.nrven_v,
            now,
            dto.payments,
          ),
        });

        return {
          mode: 'IMPORTED',
          saleId: sale.ID,
          nrven: sale.nrven_v,
          totalVenda: saleTotal,
          totalPago: paymentTotal,
          troco: this.roundMoney(paymentTotal - saleTotal),
        };
      }

      const items = this.normalizeFinalizeItems(dto.items);
      if (!items.length) {
        throw new BadRequestException(
          'Informe itens para finalizar uma venda nao importada.',
        );
      }

      const itemIds = Array.from(new Set(items.map((item) => item.idItem)));
      const numericCodes = itemIds
        .map((id) => Number(id))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.floor(value));

      const records = await tx.t_itens.findMany({
        where: {
          cdemp,
          OR: [
            { ID: { in: itemIds } },
            ...(numericCodes.length ? [{ cditem: { in: numericCodes } }] : []),
          ],
        },
        select: {
          ID: true,
          cditem: true,
          deitem: true,
          undven: true,
          cdgruit: true,
          precomin: true,
          custo: true,
          preco: true,
          ativosn: true,
          isdeleted: true,
        },
      });

      if (!records.length) {
        throw new BadRequestException('Nenhum item informado foi encontrado.');
      }

      const byId = new Map(records.map((record) => [record.ID, record]));
      const byCditem = new Map(
        records.map((record) => [record.cditem, record]),
      );

      const lines = items.map((item) => {
        const direct = byId.get(item.idItem);
        const byCode = direct ? null : byCditem.get(Number(item.idItem));
        const record = direct ?? byCode;
        if (!record) {
          throw new BadRequestException(`Item ${item.idItem} nao encontrado.`);
        }
        if (
          (record.ativosn ?? '').trim().toUpperCase() !== 'S' ||
          record.isdeleted
        ) {
          throw new BadRequestException(
            `Item ${record.cditem} nao esta ativo para venda.`,
          );
        }
        const unitPrice = this.roundMoney(
          item.unitPrice !== undefined
            ? this.toNumber(item.unitPrice)
            : this.toNumber(record.preco),
        );
        const quantity = this.toNumber(item.quantity);
        const total = this.roundMoney(unitPrice * quantity);
        return {
          record,
          unitPrice,
          quantity,
          total,
        };
      });

      const subtotal = this.roundMoney(
        lines.reduce((sum, line) => sum + line.total, 0),
      );
      const discount = this.roundMoney(this.toNumber(dto.discount));
      const deliveryFee = this.roundMoney(this.toNumber(dto.deliveryFee));
      const totalVenda = this.roundMoney(subtotal - discount + deliveryFee);
      if (paymentTotal < totalVenda) {
        throw new BadRequestException(
          'Valor pago insuficiente para efetivar a venda.',
        );
      }

      const nrven = await this.getNextSaleNumber(tx, cdemp);
      const pdesc =
        subtotal > 0 ? this.roundMoney((discount / subtotal) * 100) : 0;

      const venda = await tx.t_vendas.create({
        data: {
          nrven_v: nrven,
          cdemp_v: cdemp,
          codusu_v: userCode,
          emisven_v: now,
          horaven_v: this.formatHour(now),
          totpro_v: subtotal,
          pdesc_v: pdesc,
          vdesc_v: discount,
          vlfrete_v: deliveryFee,
          totven_v: totalVenda,
          status_v: 'E',
          dtstat_v: now,
          dtefetiv: now,
          codcx: openCashier.codabe,
          cdtpg_v: dto.payments[0]?.cdtpg ?? undefined,
          vlrtroco: dto.changeFor ?? undefined,
          obsven_v: this.trim(dto.notes, 200) ?? undefined,
          ID_CLIENTE: dto.clientId ?? undefined,
        },
      });

      const vendaId = venda.ID?.trim();
      if (!vendaId) {
        throw new BadRequestException('Venda criada sem identificador valido.');
      }

      await tx.t_itsven.createMany({
        data: lines.map((line) =>
          this.buildItsvenLine({
            cdemp,
            nrven,
            emisven: now,
            vendaId,
            item: line.record,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          }),
        ),
      });

      await tx.t_movest.createMany({
        data: lines.map((line) =>
          this.buildMovestLine({
            cdemp,
            nrven,
            userCode,
            now,
            itemCode: line.record.cditem,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.total,
            cost: this.toNumber(line.record.custo),
          }),
        ),
      });

      await tx.t_pgcaixa.createMany({
        data: this.mapPaymentRows(
          cdemp,
          userCode,
          openCashier.codabe,
          nrven,
          now,
          dto.payments,
        ),
      });

      return {
        mode: 'NEW',
        saleId: vendaId,
        nrven,
        totalVenda,
        totalPago: paymentTotal,
        troco: this.roundMoney(paymentTotal - totalVenda),
      };
    });
  }
}
