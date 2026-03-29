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
import { applyMovestBalanceFromCreates } from '../lib/movest-balance';
import {
  buildCompatibleScalarSelect,
  modelHasCompatibleScalarField,
} from '../lib/tenant-schema-compat';
import { CashierReportsPdfService } from './cashier-reports-pdf.service';
import { parseReferenceDateInput } from './reference-date';
import type {
  CashierAnalyticOrderRow,
  CashierAnalyticPaymentRow,
  CashierAnalyticReportData,
  CashierReportMeta,
  CashierSyntheticReportData,
  CashierSyntheticRow,
} from './cashier-reports.types';
import type {
  CashFinalizeDto,
  CashFinalizeItemDto,
  CashItemSearchDto,
  CashPaymentDto,
  CashierReportQueryDto,
  CloseCashierDto,
  CourierQueryDto,
  DashboardRevenueByCategoryQueryDto,
  DashboardRevenueMonthlyQueryDto,
  CustomersQueryDto,
  DispatchSaleDto,
  OpenCashierDto,
  SalesQueryDto,
  UpsertCourierDto,
  UpsertCustomerAddressDto,
  UpsertCustomerDto,
} from './dto/admin-operations.dto';

type SalesWhere = Prisma.t_vendasWhereInput;
type DailyRevenueCategoryAggregate = {
  groupId: string | null;
  label: string;
  quantity: number;
  total: number;
};
type MonthlyRevenueAggregate = {
  key: string;
  year: number;
  month: number;
  label: string;
  total: number;
  orderCount: number;
};

@Injectable()
export class AdminOperationsService {
  private readonly defaultCompanyId = 1;

  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly cashierReportsPdfService: CashierReportsPdfService,
  ) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private trim(value: unknown, maxLen = 255): string | null {
    if (value === null || value === undefined) return null;

    let text: string;
    if (typeof value === 'string') {
      text = value;
    } else if (
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      text = value.toString();
    } else {
      return null;
    }

    text = text.trim();
    if (!text) return null;
    return text.slice(0, maxLen);
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const normalizeNumericText = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return Number.NaN;

      const sanitized = trimmed.replace(/\s+/g, '').replace(/[^\d.,-]/g, '');
      if (!sanitized) return Number.NaN;

      const hasComma = sanitized.includes(',');
      const hasDot = sanitized.includes('.');
      if (hasComma && hasDot) {
        const lastComma = sanitized.lastIndexOf(',');
        const lastDot = sanitized.lastIndexOf('.');
        if (lastComma > lastDot) {
          return Number(sanitized.replace(/\./g, '').replace(',', '.'));
        }
        return Number(sanitized.replace(/,/g, ''));
      }
      if (hasComma) {
        return Number(sanitized.replace(',', '.'));
      }
      return Number(sanitized);
    };

    const parsed = (() => {
      if (typeof value === 'number') return value;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'string') return normalizeNumericText(value);
      if (typeof value === 'object') {
        const decimalLike = value as {
          toNumber?: () => number;
          toString?: () => string;
          valueOf?: () => unknown;
        };
        if (typeof decimalLike.toNumber === 'function') {
          return decimalLike.toNumber();
        }
        if (typeof decimalLike.valueOf === 'function') {
          const primitive = decimalLike.valueOf();
          if (typeof primitive === 'number') return primitive;
          if (typeof primitive === 'string')
            return normalizeNumericText(primitive);
        }
        if (typeof decimalLike.toString === 'function') {
          return normalizeNumericText(decimalLike.toString());
        }
      }
      return Number.NaN;
    })();

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

  private roundDecimal(value: number, scale = 6): number {
    const factor = 10 ** scale;
    return Math.round((value + Number.EPSILON) * factor) / factor;
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

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private endOfMonth(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
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

  private async getCompanyOptionalUuid(
    prisma: TenantClient,
    cdemp: number,
  ): Promise<string | null> {
    return String(cdemp);
  }

  private async resolveCompanyIdentity(
    prisma: TenantClient,
    preferredCdemp?: number | null,
  ): Promise<{ cdemp: number; companyId: number; companyName: string }> {
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);

    const company = (await prisma.t_emp.findFirst({
      where: { cdemp },
      select: await buildCompatibleScalarSelect(prisma, 't_emp', [
        'deemp',
        'apelido',
        'fantemp',
      ]),
    })) as
      | {
          deemp?: string | null;
          apelido?: string | null;
          fantemp?: string | null;
        }
      | null;

    if (!company) {
      throw new NotFoundException(`Empresa ${cdemp} nao encontrada.`);
    }

    const companyId = cdemp;

    const companyName =
      company.fantemp?.trim() ||
      company.apelido?.trim() ||
      company.deemp?.trim() ||
      `Empresa ${cdemp}`;

    return {
      cdemp,
      companyId,
      companyName,
    };
  }

  private toYyyyMmDd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toYyyyMm(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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

  private parseSaleId(value: string): number {
    const saleId = Math.trunc(this.toNumber(value));
    if (!Number.isInteger(saleId) || saleId <= 0) {
      throw new BadRequestException('Venda invalida.');
    }
    return saleId;
  }

  private parseAddressId(value: string): number {
    const addressId = Math.trunc(this.toNumber(value));
    if (!Number.isInteger(addressId) || addressId <= 0) {
      throw new BadRequestException('Endereco invalido.');
    }
    return addressId;
  }

  private async loadCustomersByCodes(
    prisma: TenantClient,
    cdemp: number,
    customerCodes: Array<number | null | undefined>,
  ) {
    const codes = [...new Set(customerCodes.filter((value): value is number => typeof value === 'number' && value > 0))];
    if (!codes.length) {
      return new Map<number, {
        cdcli: number;
        decli: string | null;
        celcli: string | null;
        fonecli: string | null;
        cnpj_cpfcli: string | null;
      }>();
    }

    const rows = await prisma.t_cli.findMany({
      where: {
        cdemp,
        cdcli: { in: codes },
      },
      select: {
        cdcli: true,
        decli: true,
        celcli: true,
        fonecli: true,
        cnpj_cpfcli: true,
      },
    });

    return new Map(
      rows.map((row) => [
        row.cdcli,
        {
          cdcli: row.cdcli,
          decli: row.decli ?? null,
          celcli: row.celcli ?? null,
          fonecli: row.fonecli ?? null,
          cnpj_cpfcli: row.cnpj_cpfcli ?? null,
        },
      ]),
    );
  }

  private async loadLatestAddressesByCustomerCodes(
    prisma: TenantClient,
    customerCodes: Array<number | null | undefined>,
  ) {
    const codes = [...new Set(customerCodes.filter((value): value is number => typeof value === 'number' && value > 0))];
    if (!codes.length) {
      return new Map<number, {
        autocod: number;
        bairro: string | null;
        cidade: string | null;
        logradouro: string | null;
        numero: string | null;
        complemento: string | null;
      }>();
    }

    const rows = await prisma.t_endcli.findMany({
      where: {
        cdcli: { in: codes },
        isdeleted: false,
      },
      orderBy: [{ updatedat: 'desc' }, { createdat: 'desc' }, { autocod: 'desc' }],
      select: {
        autocod: true,
        cdcli: true,
        bairro: true,
        cidade: true,
        logradouro: true,
        numero: true,
        complemento: true,
      },
    });

    const addressMap = new Map<
      number,
      {
        autocod: number;
        bairro: string | null;
        cidade: string | null;
        logradouro: string | null;
        numero: string | null;
        complemento: string | null;
      }
    >();

    for (const row of rows) {
      if (typeof row.cdcli !== 'number' || addressMap.has(row.cdcli)) {
        continue;
      }
      addressMap.set(row.cdcli, {
        autocod: row.autocod,
        bairro: row.bairro ?? null,
        cidade: row.cidade ?? null,
        logradouro: row.logradouro ?? null,
        numero: row.numero ?? null,
        complemento: row.complemento ?? null,
      });
    }

    return addressMap;
  }

  private async loadItemImageMap(
    prisma: TenantClient,
    items: Array<{ cditem?: number | null; cdemp?: number | null; locfotitem?: string | null }>,
  ) {
    const keys = items
      .map((item) => {
        const cditem =
          typeof item.cditem === 'number' && Number.isFinite(item.cditem)
            ? item.cditem
            : null;
        const cdemp =
          typeof item.cdemp === 'number' && Number.isFinite(item.cdemp)
            ? item.cdemp
            : null;
        if (cditem === null || cdemp === null) return null;
        return { cditem, cdemp };
      })
      .filter((entry): entry is { cditem: number; cdemp: number } => entry !== null);

    if (!keys.length) {
      return new Map<string, string | null>();
    }

    const rows = await prisma.t_imgitens.findMany({
      where: {
        cditem: { in: [...new Set(keys.map((entry) => entry.cditem))] },
        empitem: { in: [...new Set(keys.map((entry) => entry.cdemp))] },
      },
      orderBy: [{ autocod: 'asc' }],
      select: {
        cditem: true,
        empitem: true,
        url: true,
      },
    });

    const imageMap = new Map<string, string | null>();
    for (const row of rows) {
      if (
        typeof row.cditem !== 'number' ||
        typeof row.empitem !== 'number' ||
        imageMap.has(`${row.empitem}:${row.cditem}`)
      ) {
        continue;
      }
      imageMap.set(`${row.empitem}:${row.cditem}`, row.url?.trim() || null);
    }

    return imageMap;
  }

  private async findSaleById(
    prisma: TenantClient,
    cdemp: number,
    saleId: string,
  ) {
    const autocodV = this.parseSaleId(saleId);
    const sale = await prisma.t_vendas.findFirst({
      where: {
        autocod_v: autocodV,
        cdemp_v: cdemp,
      },
      select: {
        autocod_v: true,
        nrven_v: true,
        emisven_v: true,
        horaven_v: true,
        tpent: true,
        totpro_v: true,
        pdesc_v: true,
        totven_v: true,
        status_v: true,
        dtsainf_v: true,
        hrsainf_v: true,
        codconf_v: true,
        vlfrete_v: true,
        vlrtroco: true,
        cdcli_v: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda nao encontrada.');
    }

    const customerMap = await this.loadCustomersByCodes(prisma, cdemp, [
      sale.cdcli_v,
    ]);
    const addressMap = await this.loadLatestAddressesByCustomerCodes(prisma, [
      sale.cdcli_v,
    ]);
    const customer =
      typeof sale.cdcli_v === 'number' ? customerMap.get(sale.cdcli_v) ?? null : null;
    const address =
      typeof sale.cdcli_v === 'number' ? addressMap.get(sale.cdcli_v) ?? null : null;

    return {
      ...sale,
      customer,
      address,
    };
  }

  private async buildSalesWhere(
    prisma: TenantClient,
    cdemp: number,
    query: SalesQueryDto,
  ): Promise<SalesWhere> {
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
      const customerMatches = await prisma.t_cli.findMany({
        where: {
          cdemp,
          decli: { contains: term },
        },
        select: { cdcli: true },
      });
      const customerCodes = customerMatches.map((row) => row.cdcli);
      and.push({
        OR: [
          { nrpedcli_v: { contains: term } },
          ...(customerCodes.length ? [{ cdcli_v: { in: customerCodes } }] : []),
        ],
      });
    }

    if (query.bairro?.trim() || query.cidade?.trim()) {
      const addressMatches = await prisma.t_endcli.findMany({
        where: {
          isdeleted: false,
          ...(query.bairro?.trim()
            ? { bairro: { contains: query.bairro.trim() } }
            : {}),
          ...(query.cidade?.trim()
            ? { cidade: { contains: query.cidade.trim() } }
            : {}),
        },
        select: { cdcli: true },
      });
      const customerCodes = addressMatches
        .map((row) => row.cdcli)
        .filter((value): value is number => typeof value === 'number');
      and.push({
        cdcli_v: customerCodes.length ? { in: customerCodes } : -1,
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

    const where = await this.buildSalesWhere(prisma, cdemp, query);

    const rows = await prisma.t_vendas.findMany({
      where,
      orderBy: [{ emisven_v: 'desc' }, { nrven_v: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        autocod_v: true,
        nrven_v: true,
        emisven_v: true,
        horaven_v: true,
        tpent: true,
        totpro_v: true,
        pdesc_v: true,
        totven_v: true,
        status_v: true,
        dtsainf_v: true,
        hrsainf_v: true,
        codconf_v: true,
        vlfrete_v: true,
        vlrtroco: true,
        cdcli_v: true,
      },
    });

    const total = await prisma.t_vendas.count({ where });
    const summaryByStatus = await prisma.t_vendas.groupBy({
      by: ['status_v'],
      where,
      _count: { _all: true },
      _sum: { totven_v: true },
    });
    const aggregateTotal = await prisma.t_vendas.aggregate({
      where,
      _count: { _all: true },
      _sum: { totven_v: true, totpro_v: true },
    });

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
    const customerMap = await this.loadCustomersByCodes(
      prisma,
      cdemp,
      rows.map((row) => row.cdcli_v),
    );
    const addressMap = await this.loadLatestAddressesByCustomerCodes(
      prisma,
      rows.map((row) => row.cdcli_v),
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
        const customer =
          typeof row.cdcli_v === 'number'
            ? customerMap.get(row.cdcli_v) ?? null
            : null;
        const address =
          typeof row.cdcli_v === 'number'
            ? addressMap.get(row.cdcli_v) ?? null
            : null;
        const dtPedido = row.emisven_v ?? null;
        const dtSaida = row.dtsainf_v ?? null;
        const minutosDesdeSaida = this.minutesSince(dtSaida);

        return {
          id: row.autocod_v,
          pedido: row.nrven_v,
          data: dtPedido,
          horarioPedido: row.horaven_v ?? null,
          tipoEntrega: row.tpent ?? null,
          cliente: customer?.decli ?? null,
          totalProduto: this.toNumber(row.totpro_v),
          descontoPerc: this.toNumber(row.pdesc_v),
          totalVenda: this.toNumber(row.totven_v),
          status: row.status_v ?? null,
          bairro: address?.bairro ?? null,
          cidade: address?.cidade ?? null,
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

  async getDailyRevenueByCategory(
    tenant: string,
    preferredCdemp: number | null,
    query: DashboardRevenueByCategoryQueryDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const { cdemp, companyId, companyName } = await this.resolveCompanyIdentity(
      prisma,
      preferredCdemp,
    );
    const referenceDate = this.normalizeReferenceDate(query.referenceDate);
    const dayStart = this.startOfDay(referenceDate);
    const dayEnd = this.endOfDay(referenceDate);
    const limit =
      Number.isFinite(query.limit) && query.limit && query.limit > 0
        ? Math.min(Math.floor(query.limit), 50)
        : 8;

    const sales = await prisma.t_vendas.findMany({
      where: {
        cdemp_v: cdemp,
        isdeleted: false,
        status_v: { not: 'C' },
        emisven_v: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        nrven_v: true,
      },
    });

    const saleNumbers = Array.from(
      new Set(
        sales
          .map((sale) => sale.nrven_v)
          .filter((nrven): nrven is number => Number.isInteger(nrven)),
      ),
    );

    if (!saleNumbers.length) {
      return {
        referenceDate: this.toYyyyMmDd(referenceDate),
        company: {
          cdemp,
          id: companyId,
          name: companyName,
        },
        summary: {
          totalRevenue: 0,
          totalQuantity: 0,
          totalOrders: 0,
          totalCategories: 0,
        },
        categories: [],
      };
    }

    const rows = await prisma.t_itsven.findMany({
      where: {
        isdeleted: false,
        empven: cdemp,
        nrven_iv: { in: saleNumbers },
        OR: [{ mp: null }, { mp: { not: 'S' } }],
      },
      select: {
        cdgru_iv: true,
        qtdesol_iv: true,
        precven_iv: true,
        vdesc_iv: true,
      },
    });

    const groupIds = Array.from(
      new Set(
        rows
          .map((row) => row.cdgru_iv)
          .filter(
            (groupCode): groupCode is number =>
              typeof groupCode === 'number' && Number.isInteger(groupCode),
          ),
      ),
    );
    const groups = groupIds.length
      ? await prisma.t_gritens.findMany({
          where: {
            cdgru: { in: groupIds },
            isdeleted: false,
          },
          select: {
            cdgru: true,
            degru: true,
          },
        })
      : [];
    const groupNameById = new Map(
      groups
        .map((group) => {
          if (typeof group.cdgru !== 'number') return null;
          return [group.cdgru, group.degru?.trim() ?? null] as const;
        })
        .filter(
          (entry): entry is readonly [number, string | null] => entry !== null,
        ),
    );

    const aggregates = new Map<string, DailyRevenueCategoryAggregate>();

    for (const row of rows) {
      const groupId =
        typeof row.cdgru_iv === 'number' && Number.isInteger(row.cdgru_iv)
          ? String(row.cdgru_iv)
          : null;
      const mapKey = groupId ?? '__sem-categoria__';
      const quantity = this.toNumber(row.qtdesol_iv);
      const unitPrice = this.toNumber(row.precven_iv);
      const discount = this.toNumber(row.vdesc_iv);
      const total = this.roundMoney(
        Math.max(0, quantity * unitPrice - discount),
      );

      if (quantity <= 0 && total <= 0) {
        continue;
      }

      const current = aggregates.get(mapKey);
      const label = groupId
        ? (groupNameById.get(Number(groupId))?.trim() ?? 'Categoria sem nome')
        : 'Sem categoria';

      if (!current) {
        aggregates.set(mapKey, {
          groupId,
          label,
          quantity,
          total,
        });
        continue;
      }

      current.quantity = this.roundMoney(current.quantity + quantity);
      current.total = this.roundMoney(current.total + total);
      if (
        current.label === 'Categoria sem nome' &&
        label !== 'Categoria sem nome'
      ) {
        current.label = label;
      }
    }

    const ordered = Array.from(aggregates.values()).sort((left, right) => {
      const byTotal = right.total - left.total;
      if (Math.abs(byTotal) > Number.EPSILON) return byTotal;

      const byQuantity = right.quantity - left.quantity;
      if (Math.abs(byQuantity) > Number.EPSILON) return byQuantity;

      return left.label.localeCompare(right.label, 'pt-BR');
    });

    const totalRevenue = this.roundMoney(
      ordered.reduce((sum, entry) => sum + entry.total, 0),
    );
    const totalQuantity = this.roundMoney(
      ordered.reduce((sum, entry) => sum + entry.quantity, 0),
    );

    return {
      referenceDate: this.toYyyyMmDd(referenceDate),
      company: {
        cdemp,
        id: companyId,
        name: companyName,
      },
      summary: {
        totalRevenue,
        totalQuantity,
        totalOrders: saleNumbers.length,
        totalCategories: ordered.length,
      },
      categories: ordered.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        groupId: entry.groupId,
        label: entry.label,
        quantity: entry.quantity,
        total: entry.total,
      })),
    };
  }

  async getMonthlyRevenue(
    tenant: string,
    preferredCdemp: number | null,
    query: DashboardRevenueMonthlyQueryDto,
  ) {
    const prisma = await this.getPrisma(tenant);
    const { cdemp, companyId, companyName } = await this.resolveCompanyIdentity(
      prisma,
      preferredCdemp,
    );
    const referenceDate = this.normalizeReferenceDate(query.referenceDate);
    const months =
      Number.isFinite(query.months) && query.months && query.months > 0
        ? Math.min(Math.floor(query.months), 24)
        : 12;
    const monthLabels = [
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ',
    ];

    const firstMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (months - 1),
      1,
    );
    const rangeStart = this.startOfMonth(firstMonth);
    const rangeEnd = this.endOfMonth(referenceDate);

    const buckets = new Map<string, MonthlyRevenueAggregate>();
    const orderedKeys: string[] = [];
    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const monthDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - offset,
        1,
      );
      const key = this.toYyyyMm(monthDate);
      orderedKeys.push(key);
      buckets.set(key, {
        key,
        year: monthDate.getFullYear(),
        month: monthDate.getMonth() + 1,
        label: monthLabels[monthDate.getMonth()] ?? key,
        total: 0,
        orderCount: 0,
      });
    }

    const sales = await prisma.t_vendas.findMany({
      where: {
        cdemp_v: cdemp,
        isdeleted: false,
        status_v: { not: 'C' },
        emisven_v: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      select: {
        autocod_v: true,
        emisven_v: true,
        totven_v: true,
      },
    });

    const orderIds = new Set<string>();
    for (const sale of sales) {
      const emittedAt = sale.emisven_v;
      if (!emittedAt) continue;

      const bucket = buckets.get(this.toYyyyMm(emittedAt));
      if (!bucket) continue;

      bucket.total = this.roundMoney(
        bucket.total + this.toNumber(sale.totven_v),
      );
      bucket.orderCount += 1;

      orderIds.add(String(sale.autocod_v));
    }

    const items = orderedKeys
      .map((key) => buckets.get(key))
      .filter((entry): entry is MonthlyRevenueAggregate => Boolean(entry));
    const totalRevenue = this.roundMoney(
      items.reduce((sum, entry) => sum + entry.total, 0),
    );
    const totalOrders =
      orderIds.size || items.reduce((sum, item) => sum + item.orderCount, 0);
    const monthsWithSales = items.filter((item) => item.orderCount > 0).length;

    return {
      referenceDate: this.toYyyyMmDd(referenceDate),
      company: {
        cdemp,
        id: companyId,
        name: companyName,
      },
      summary: {
        totalRevenue,
        totalOrders,
        months,
        monthsWithSales,
      },
      items: items.map((entry) => ({
        key: entry.key,
        year: entry.year,
        month: entry.month,
        label: entry.label,
        total: entry.total,
        orderCount: entry.orderCount,
      })),
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
      id: sale.autocod_v,
      pedido: sale.nrven_v,
      data: sale.emisven_v ?? null,
      horarioPedido: sale.horaven_v ?? null,
      tipoEntrega: sale.tpent ?? null,
      horarioSaidaEntrega: sale.hrsainf_v ?? null,
      dataSaidaEntrega: sale.dtsainf_v ?? null,
      minutosDesdeSaida: this.minutesSince(sale.dtsainf_v),
      totalProduto: this.toNumber(sale.totpro_v),
      descontoPerc: this.toNumber(sale.pdesc_v),
      totalVenda: this.toNumber(sale.totven_v),
      status: sale.status_v ?? null,
      taxaEntrega: this.toNumber(sale.vlfrete_v),
      troco: this.toNumber(sale.vlrtroco),
      cliente: sale.customer
        ? {
            cdcli: sale.customer.cdcli,
            nome: sale.customer.decli ?? null,
            telefone: sale.customer.celcli ?? sale.customer.fonecli ?? null,
            cpfCnpj: sale.customer.cnpj_cpfcli ?? null,
            endereco: sale.address
              ? {
                  bairro: sale.address.bairro ?? null,
                  cidade: sale.address.cidade ?? null,
                  logradouro: sale.address.logradouro ?? null,
                  numero: sale.address.numero ?? null,
                  complemento: sale.address.complemento ?? null,
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
      where: { autocod_v: this.parseSaleId(saleId), cdemp_v: cdemp },
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
        customerName: refreshed.customer?.decli ?? null,
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
      id: refreshed.autocod_v,
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
    const cdcli = Math.trunc(this.toNumber(customerId));
    if (!Number.isInteger(cdcli) || cdcli <= 0) {
      throw new BadRequestException('Cliente invalido.');
    }

    const customer = await prisma.t_cli.findFirst({
      where: {
        cdcli,
        cdemp,
      },
      select: {
        cdcli: true,
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

    const customerCodes = rows.map((row) => row.cdcli);
    const addresses = customerCodes.length
      ? await prisma.t_endcli.groupBy({
          by: ['cdcli'],
          where: {
            cdcli: { in: customerCodes },
            isdeleted: false,
          },
          _count: { _all: true },
        })
      : [];
    const addressCountMap = new Map(
      addresses
        .filter(
          (entry): entry is { cdcli: number; _count: { _all: number } } =>
            typeof entry.cdcli === 'number',
        )
        .map((entry) => [entry.cdcli, entry._count._all]),
    );

    return {
      page,
      limit,
      total,
      items: rows.map((row) => ({
        ...row,
        addressCount: addressCountMap.get(row.cdcli) ?? 0,
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
    const customerRef = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );

    const [customer, addresses] = await Promise.all([
      prisma.t_cli.findUnique({
        where: { cdcli: customerRef.cdcli },
      }),
      prisma.t_endcli.findMany({
        where: {
          cdcli: customerRef.cdcli,
          isdeleted: false,
        },
        orderBy: [{ updatedat: 'desc' }, { createdat: 'desc' }],
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return {
      ...customer,
      t_endcli: addresses,
    };
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
    const customerRef = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );

    return prisma.t_cli.update({
      where: { cdcli: customerRef.cdcli },
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
    const customerRef = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );

    await prisma.t_cli.update({
      where: { cdcli: customerRef.cdcli },
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
    const customer = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );

    return prisma.t_endcli.findMany({
      where: {
        cdcli: customer.cdcli,
        isdeleted: false,
      },
      orderBy: [{ updatedat: 'desc' }, { createdat: 'desc' }],
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
    const customer = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );

    return prisma.t_endcli.create({
      data: {
        cdcli: customer.cdcli,
        cep: this.trim(dto.cep, 10) ?? undefined,
        logradouro: this.trim(dto.logradouro, 100) ?? undefined,
        numero: this.trim(dto.numero, 20) ?? undefined,
        bairro: this.trim(dto.bairro, 60) ?? undefined,
        cidade: this.trim(dto.cidade, 60) ?? undefined,
        uf: this.trim(dto.uf, 2) ?? undefined,
        complemento: this.trim(dto.complemento, 100) ?? undefined,
        ponto_referencia: this.trim(dto.pontoReferencia, 255) ?? undefined,
        tipo_local: this.trim(dto.tipoLocal, 20) ?? undefined,
        instrucoes_entrega: this.trim(dto.instrucoesEntrega, 1000) ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        cdusu: this.normalizeUserCode(userIdentifier),
        tipo_endereco: this.trim(dto.tipoEndereco, 3) ?? undefined,
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
    const customer = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );
    const normalizedAddressId = this.parseAddressId(addressId);

    const existing = await prisma.t_endcli.findFirst({
      where: {
        autocod: normalizedAddressId,
        cdcli: customer.cdcli,
        isdeleted: false,
      },
      select: { autocod: true },
    });
    if (!existing) {
      throw new NotFoundException('Endereco nao encontrado para o cliente.');
    }

    return prisma.t_endcli.update({
      where: { autocod: normalizedAddressId },
      data: {
        cep: this.trim(dto.cep, 10) ?? undefined,
        logradouro: this.trim(dto.logradouro, 100) ?? undefined,
        numero: this.trim(dto.numero, 20) ?? undefined,
        bairro: this.trim(dto.bairro, 60) ?? undefined,
        cidade: this.trim(dto.cidade, 60) ?? undefined,
        uf: this.trim(dto.uf, 2) ?? undefined,
        complemento: this.trim(dto.complemento, 100) ?? undefined,
        ponto_referencia: this.trim(dto.pontoReferencia, 255) ?? undefined,
        tipo_local: this.trim(dto.tipoLocal, 20) ?? undefined,
        instrucoes_entrega: this.trim(dto.instrucoesEntrega, 1000) ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        tipo_endereco: this.trim(dto.tipoEndereco, 3) ?? undefined,
        cdusu: this.normalizeUserCode(userIdentifier),
        updatedat: new Date(),
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
    const customer = await this.ensureCustomerBelongsToCompany(
      prisma,
      cdemp,
      customerId,
    );
    const normalizedAddressId = this.parseAddressId(addressId);

    const updated = await prisma.t_endcli.updateMany({
      where: {
        autocod: normalizedAddressId,
        cdcli: customer.cdcli,
        isdeleted: false,
      },
      data: {
        isdeleted: true,
        updatedat: new Date(),
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

  private normalizeReferenceDate(value?: string): Date {
    if (!value) return new Date();
    const parsed = parseReferenceDateInput(value);

    if (!parsed) {
      throw new BadRequestException('Data de referencia invalida.');
    }

    return parsed;
  }

  private async resolveCashierForReport(
    prisma: TenantClient,
    cdemp: number,
    userCode: string,
    codabe?: number,
  ) {
    if (codabe && Number.isFinite(codabe) && codabe > 0) {
      const cashier = await prisma.t_cxabe.findFirst({
        where: {
          codemp: cdemp,
          codabe,
          codusu: userCode,
        },
      });
      if (!cashier) {
        throw new NotFoundException('Caixa informado nao encontrado.');
      }
      return cashier;
    }

    const openCashier = await this.getOpenCashier(prisma, cdemp, userCode);
    if (openCashier) return openCashier;

    const latestCashier = await prisma.t_cxabe.findFirst({
      where: {
        codemp: cdemp,
        codusu: userCode,
      },
      orderBy: [{ databe: 'desc' }, { codabe: 'desc' }],
    });

    if (!latestCashier) {
      throw new NotFoundException(
        'Nenhum caixa encontrado para o usuario informado.',
      );
    }

    return latestCashier;
  }

  private toGroupedPaymentMap(
    rows: Array<{ cdtpg: number; _sum: { valor: Prisma.Decimal | null } }>,
  ): Map<number, number> {
    return new Map(
      rows.map((row) => [
        row.cdtpg,
        this.roundMoney(this.toNumber(row._sum.valor)),
      ]),
    );
  }

  private async resolveCompanyName(prisma: TenantClient, cdemp: number) {
    const company = await prisma.t_emp.findFirst({
      where: { cdemp },
      select: {
        deemp: true,
        apelido: true,
        fantemp: true,
      },
    });

    return (
      company?.fantemp?.trim() ||
      company?.apelido?.trim() ||
      company?.deemp?.trim() ||
      `Empresa ${cdemp}`
    );
  }

  private buildReportMeta(payload: {
    tenant: string;
    companyId: number;
    companyName: string;
    cashierId: number;
    cashierUserCode: string;
    openedAt: Date | null;
    closedAt: Date | null;
    generatedAt: Date;
    referenceDate: Date;
    monthStart: Date;
    monthEnd: Date;
  }): CashierReportMeta {
    return {
      tenant: payload.tenant,
      companyId: payload.companyId,
      companyName: payload.companyName,
      cashierId: payload.cashierId,
      cashierUserCode: payload.cashierUserCode,
      openedAt: payload.openedAt,
      closedAt: payload.closedAt,
      generatedAt: payload.generatedAt,
      referenceDate: payload.referenceDate,
      monthStart: payload.monthStart,
      monthEnd: payload.monthEnd,
    };
  }

  private buildPdfFileName(
    prefix: string,
    cashierId: number,
    generatedAt: Date,
  ) {
    const year = generatedAt.getFullYear();
    const month = String(generatedAt.getMonth() + 1).padStart(2, '0');
    const day = String(generatedAt.getDate()).padStart(2, '0');
    const hour = String(generatedAt.getHours()).padStart(2, '0');
    const minute = String(generatedAt.getMinutes()).padStart(2, '0');
    const second = String(generatedAt.getSeconds()).padStart(2, '0');
    return `${prefix}-cx${cashierId}-${year}${month}${day}-${hour}${minute}${second}.pdf`;
  }

  async getCashierSyntheticReport(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    query: CashierReportQueryDto,
    canViewSensitiveTotals: boolean,
  ): Promise<CashierSyntheticReportData> {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);
    const referenceDate = this.normalizeReferenceDate(query.referenceDate);

    const cashier = await this.resolveCashierForReport(
      prisma,
      cdemp,
      userCode,
      query.codabe,
    );

    const reportUserCode = this.normalizeUserCode(cashier.codusu ?? userCode);
    const generatedAt = new Date();
    const dayStart = this.startOfDay(referenceDate);
    const dayEnd = this.endOfDay(referenceDate);
    const monthStart = this.startOfMonth(referenceDate);
    const monthEnd = this.endOfMonth(referenceDate);

    const [
      cashRows,
      todayRows,
      accumulatedRows,
      untilYesterdayRows,
      config,
      docsByStatus,
      salesAggregate,
      companyName,
    ] = await Promise.all([
      prisma.t_pgcaixa.groupBy({
        by: ['cdtpg'],
        where: {
          cdemp,
          nrcx: cashier.codabe,
        },
        _sum: { valor: true },
      }),
      prisma.t_pgcaixa.groupBy({
        by: ['cdtpg'],
        where: {
          cdemp,
          cdusu: reportUserCode,
          data: { gte: dayStart, lte: dayEnd },
        },
        _sum: { valor: true },
      }),
      prisma.t_pgcaixa.groupBy({
        by: ['cdtpg'],
        where: {
          cdemp,
          cdusu: reportUserCode,
          data: { gte: monthStart, lte: dayEnd },
        },
        _sum: { valor: true },
      }),
      dayStart.getTime() <= monthStart.getTime()
        ? Promise.resolve(
            [] as Array<{
              cdtpg: number;
              _sum: { valor: Prisma.Decimal | null };
            }>,
          )
        : prisma.t_pgcaixa.groupBy({
            by: ['cdtpg'],
            where: {
              cdemp,
              cdusu: reportUserCode,
              data: { gte: monthStart, lt: dayStart },
            },
            _sum: { valor: true },
          }),
      prisma.t_config.findFirst({
        orderBy: { autocod: 'desc' },
        select: { coddin: true },
      }),
      prisma.$queryRaw<Array<{ status: string | null; total: unknown }>>`
        SELECT UPPER(TRIM(COALESCE(status, ''))) AS status,
               SUM(COALESCE(valor, 0)) AS total
        FROM t_cxdoc
        WHERE cdemp = ${cdemp}
          AND codcx = ${cashier.codabe}
        GROUP BY UPPER(TRIM(COALESCE(status, '')))
      `,
      prisma.t_vendas.aggregate({
        where: {
          cdemp_v: cdemp,
          codcx: cashier.codabe,
          status_v: 'E',
          isdeleted: false,
        },
        _sum: { totven_v: true },
      }),
      this.resolveCompanyName(prisma, cdemp),
    ]);

    const cashMap = this.toGroupedPaymentMap(cashRows);
    const untilYesterdayMap = this.toGroupedPaymentMap(untilYesterdayRows);
    const todayMap = this.toGroupedPaymentMap(todayRows);
    const accumulatedMap = this.toGroupedPaymentMap(accumulatedRows);

    const paymentTypeIds = Array.from(
      new Set([
        ...cashMap.keys(),
        ...untilYesterdayMap.keys(),
        ...todayMap.keys(),
        ...accumulatedMap.keys(),
      ]),
    );

    const paymentTypeRows = paymentTypeIds.length
      ? await prisma.t_tpgto.findMany({
          where: { cdtpg: { in: paymentTypeIds } },
          select: { cdtpg: true, detpg: true },
        })
      : [];
    const paymentTypeMap = new Map(
      paymentTypeRows.map((row) => [
        row.cdtpg,
        row.detpg?.trim() || `Tipo ${row.cdtpg}`,
      ]),
    );

    const rows: CashierSyntheticRow[] = paymentTypeIds
      .map((cdtpg) => {
        const totalUntilPreviousDay = this.roundMoney(
          untilYesterdayMap.get(cdtpg) ?? 0,
        );
        const totalAccumulated = this.roundMoney(
          accumulatedMap.get(cdtpg) ?? 0,
        );

        return {
          cdtpg,
          paymentType: paymentTypeMap.get(cdtpg) ?? `Tipo ${cdtpg}`,
          totalCashier: this.roundMoney(cashMap.get(cdtpg) ?? 0),
          totalUntilPreviousDay: canViewSensitiveTotals
            ? totalUntilPreviousDay
            : null,
          totalToday: this.roundMoney(todayMap.get(cdtpg) ?? 0),
          totalAccumulated: canViewSensitiveTotals ? totalAccumulated : null,
        };
      })
      .sort((a, b) => a.paymentType.localeCompare(b.paymentType, 'pt-BR'));

    const openingBalance = this.roundMoney(this.toNumber(cashier.salabe));
    const totalSales = this.roundMoney(
      this.toNumber(salesAggregate._sum?.totven_v),
    );

    let withdrawalsTotal = 0;
    let suppliesTotal = 0;
    for (const row of docsByStatus) {
      const status = (row.status ?? '').trim().toUpperCase();
      const total = this.roundMoney(this.toNumber(row.total));
      if (status === 'D') withdrawalsTotal += total;
      if (status === 'C') suppliesTotal += total;
    }

    withdrawalsTotal = this.roundMoney(withdrawalsTotal);
    suppliesTotal = this.roundMoney(suppliesTotal);

    const moneyTypeId =
      config?.coddin && Number.isFinite(config.coddin) ? config.coddin : null;
    const cashSalesTotal = this.roundMoney(
      moneyTypeId ? (cashMap.get(moneyTypeId) ?? 0) : 0,
    );

    const cashInDrawerTotal = this.roundMoney(
      cashSalesTotal + openingBalance + suppliesTotal - withdrawalsTotal,
    );
    const closingBalance = this.roundMoney(
      totalSales + openingBalance + suppliesTotal - withdrawalsTotal,
    );

    const sumTotalCashier = this.roundMoney(
      rows.reduce((sum, row) => sum + row.totalCashier, 0),
    );
    const sumTotalToday = this.roundMoney(
      rows.reduce((sum, row) => sum + row.totalToday, 0),
    );
    const sumTotalUntilPreviousDay = canViewSensitiveTotals
      ? this.roundMoney(
          rows.reduce((sum, row) => sum + (row.totalUntilPreviousDay ?? 0), 0),
        )
      : null;
    const sumTotalAccumulated = canViewSensitiveTotals
      ? this.roundMoney(
          rows.reduce((sum, row) => sum + (row.totalAccumulated ?? 0), 0),
        )
      : null;

    return {
      meta: this.buildReportMeta({
        tenant,
        companyId: cdemp,
        companyName,
        cashierId: cashier.codabe,
        cashierUserCode: reportUserCode,
        openedAt: cashier.databe ?? null,
        closedAt: cashier.datfec ?? null,
        generatedAt,
        referenceDate: dayStart,
        monthStart,
        monthEnd,
      }),
      permissions: {
        canViewSensitiveTotals,
        restrictedColumnsHidden: !canViewSensitiveTotals,
      },
      rows,
      footer: {
        sumTotalCashier,
        sumTotalUntilPreviousDay,
        sumTotalToday,
        sumTotalAccumulated,
        openingBalance,
        withdrawalsTotal,
        suppliesTotal,
        cashSalesTotal,
        cashInDrawerTotal,
        totalSales,
        closingBalance,
      },
    };
  }

  async getCashierSyntheticReportPdf(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    query: CashierReportQueryDto,
    canViewSensitiveTotals: boolean,
  ) {
    const report = await this.getCashierSyntheticReport(
      tenant,
      preferredCdemp,
      userIdentifier,
      query,
      canViewSensitiveTotals,
    );
    const file = await this.cashierReportsPdfService.createSyntheticPdf(report);
    const filename = this.buildPdfFileName(
      'relatorio-sintetico-caixa',
      report.meta.cashierId,
      report.meta.generatedAt,
    );
    return { filename, file };
  }

  async getCashierAnalyticReport(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    query: CashierReportQueryDto,
  ): Promise<CashierAnalyticReportData> {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.resolveCdemp(prisma, preferredCdemp);
    const userCode = this.normalizeUserCode(userIdentifier);
    const referenceDate = this.normalizeReferenceDate(query.referenceDate);

    const cashier = await this.resolveCashierForReport(
      prisma,
      cdemp,
      userCode,
      query.codabe,
    );

    const reportUserCode = this.normalizeUserCode(cashier.codusu ?? userCode);
    const generatedAt = new Date();
    const monthStart = this.startOfMonth(referenceDate);
    const monthEnd = this.endOfMonth(referenceDate);

    const [sales, companyName] = await Promise.all([
      prisma.t_vendas.findMany({
        where: {
          cdemp_v: cdemp,
          codcx: cashier.codabe,
          status_v: 'E',
          isdeleted: false,
        },
        orderBy: [{ nrven_v: 'asc' }],
        select: {
          autocod_v: true,
          nrven_v: true,
          emisven_v: true,
          horaven_v: true,
          totven_v: true,
          cdcli_v: true,
        },
      }),
      this.resolveCompanyName(prisma, cdemp),
    ]);

    const nrvens = sales.map((sale) => sale.nrven_v);

    const paymentRows = nrvens.length
      ? await prisma.t_pgcaixa.findMany({
          where: {
            cdemp,
            nrcx: cashier.codabe,
            nrven: { in: nrvens },
          },
          orderBy: [{ nrven: 'asc' }, { registro: 'asc' }],
          select: {
            nrven: true,
            cdtpg: true,
            valor: true,
          },
        })
      : [];

    const paymentTypeIds = Array.from(
      new Set(paymentRows.map((row) => row.cdtpg)),
    );
    const paymentTypes = paymentTypeIds.length
      ? await prisma.t_tpgto.findMany({
          where: { cdtpg: { in: paymentTypeIds } },
          select: { cdtpg: true, detpg: true },
        })
      : [];
    const paymentTypeMap = new Map(
      paymentTypes.map((row) => [
        row.cdtpg,
        row.detpg?.trim() || `Tipo ${row.cdtpg}`,
      ]),
    );
    const customerMap = await this.loadCustomersByCodes(
      prisma,
      cdemp,
      sales.map((sale) => sale.cdcli_v),
    );

    const paymentsByOrder = new Map<number, CashierAnalyticPaymentRow[]>();
    for (const row of paymentRows) {
      const current = paymentsByOrder.get(row.nrven) ?? [];
      current.push({
        cdtpg: row.cdtpg,
        paymentType: paymentTypeMap.get(row.cdtpg) ?? `Tipo ${row.cdtpg}`,
        value: this.roundMoney(this.toNumber(row.valor)),
      });
      paymentsByOrder.set(row.nrven, current);
    }

    const orders: CashierAnalyticOrderRow[] = sales.map((sale) => {
      const payments = paymentsByOrder.get(sale.nrven_v) ?? [];
      const totalPaid = this.roundMoney(
        payments.reduce((sum, payment) => sum + payment.value, 0),
      );

      return {
        nrven: sale.nrven_v,
        saleId: String(sale.autocod_v),
        issuedAt: sale.emisven_v ?? null,
        saleHour: sale.horaven_v ?? null,
        customerName:
          (typeof sale.cdcli_v === 'number'
            ? customerMap.get(sale.cdcli_v)?.decli
            : null) ?? null,
        totalSale: this.roundMoney(this.toNumber(sale.totven_v)),
        totalPaid,
        payments,
      };
    });

    const summary = {
      ordersCount: orders.length,
      totalSale: this.roundMoney(
        orders.reduce((sum, order) => sum + order.totalSale, 0),
      ),
      totalPaid: this.roundMoney(
        orders.reduce((sum, order) => sum + order.totalPaid, 0),
      ),
    };

    return {
      meta: this.buildReportMeta({
        tenant,
        companyId: cdemp,
        companyName,
        cashierId: cashier.codabe,
        cashierUserCode: reportUserCode,
        openedAt: cashier.databe ?? null,
        closedAt: cashier.datfec ?? null,
        generatedAt,
        referenceDate: this.startOfDay(referenceDate),
        monthStart,
        monthEnd,
      }),
      summary,
      orders,
    };
  }

  async getCashierAnalyticReportPdf(
    tenant: string,
    preferredCdemp: number | null,
    userIdentifier: string,
    query: CashierReportQueryDto,
  ) {
    const report = await this.getCashierAnalyticReport(
      tenant,
      preferredCdemp,
      userIdentifier,
      query,
    );
    const file = await this.cashierReportsPdfService.createAnalyticPdf(report);
    const filename = this.buildPdfFileName(
      'relatorio-analitico-caixa',
      report.meta.cashierId,
      report.meta.generatedAt,
    );
    return { filename, file };
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
        cdemp: true,
        cditem: true,
        deitem: true,
        undven: true,
        barcodeit: true,
        preco: true,
        locfotitem: true,
      },
    });
    const imageMap = await this.loadItemImageMap(prisma, rows);

    return rows.map((row) => ({
      id: String(row.cditem),
      cditem: row.cditem,
      descricao: row.deitem,
      unidade: row.undven,
      codigoBarras: row.barcodeit,
      preco: this.toNumber(row.preco),
      imagem:
        imageMap.get(`${row.cdemp}:${row.cditem}`) ||
        row.locfotitem?.trim() ||
        null,
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
        autocod_v: true,
        nrven_v: true,
        emisven_v: true,
        totven_v: true,
        cdcli_v: true,
      },
    });
    const customerMap = await this.loadCustomersByCodes(
      prisma,
      cdemp,
      rows.map((row) => row.cdcli_v),
    );

    return rows.map((row) => ({
      id: row.autocod_v,
      pedido: row.nrven_v,
      data: row.emisven_v,
      cliente:
        (typeof row.cdcli_v === 'number'
          ? customerMap.get(row.cdcli_v)?.decli
          : null) ?? null,
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
        autocod_v: this.parseSaleId(saleId),
        cdemp_v: cdemp,
        status_v: 'A',
      },
      select: {
        autocod_v: true,
        nrven_v: true,
        emisven_v: true,
        totven_v: true,
        cdcli_v: true,
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
        cditem_iv: true,
        deitem_iv: true,
        qtdesol_iv: true,
        precven_iv: true,
      },
    });
    const customerMap = await this.loadCustomersByCodes(prisma, cdemp, [
      sale.cdcli_v,
    ]);
    const customer =
      typeof sale.cdcli_v === 'number' ? customerMap.get(sale.cdcli_v) ?? null : null;

    return {
      id: sale.autocod_v,
      pedido: sale.nrven_v,
      data: sale.emisven_v,
      cliente: customer
        ? { cdcli: customer.cdcli, nome: customer.decli ?? null }
        : null,
      totalVenda: this.toNumber(sale.totven_v),
      items: items.map((item) => ({
        registro: item.registro,
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
      createdat: now,
      updatedat: now,
    }));
  }

  private buildItsvenLine(payload: {
    cdemp: number;
    nrven: number;
    emisven: Date;
    vendaId: string;
    item: {
      cditem: number;
      deitem: string | null;
      undven: string | null;
      cdgruit: number | null;
      precomin: unknown;
      custo: unknown;
    };
    quantity: number;
    unitPrice: number;
    mp?: 'S' | 'N';
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
      mp: payload.mp ?? 'N',
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

  private isYesFlag(value: unknown): boolean {
    return String(value ?? '').trim().toUpperCase() === 'S';
  }

  private resolveCashFinalizeItemCode(item: CashFinalizeItemDto): number | null {
    const idItem = this.toOptionalNumber(item.idItem);
    const cditem = this.toOptionalNumber(item.cditem);

    const normalizedIdItem =
      idItem !== null && Number.isFinite(idItem) ? Math.floor(idItem) : null;
    const normalizedCditem =
      cditem !== null && Number.isFinite(cditem) ? Math.floor(cditem) : null;

    if (
      normalizedIdItem !== null &&
      normalizedCditem !== null &&
      normalizedIdItem > 0 &&
      normalizedCditem > 0 &&
      normalizedIdItem !== normalizedCditem
    ) {
      throw new BadRequestException(
        'Item de venda com identificadores divergentes.',
      );
    }

    if (normalizedIdItem !== null && normalizedIdItem > 0) {
      return normalizedIdItem;
    }

    if (normalizedCditem !== null && normalizedCditem > 0) {
      return normalizedCditem;
    }

    return null;
  }

  private normalizeFinalizeItems(
    items: CashFinalizeItemDto[] | undefined,
  ): Array<CashFinalizeItemDto & { cditem: number }> {
    if (!items?.length) return [];

    const normalized: Array<CashFinalizeItemDto & { cditem: number }> = [];

    for (const item of items) {
      const cditem = this.resolveCashFinalizeItemCode(item);
      const quantity = this.toNumber(item.quantity);
      const unitPrice =
        item.unitPrice !== undefined
          ? this.toNumber(item.unitPrice)
          : undefined;

      if (quantity > 0 && cditem === null) {
        throw new BadRequestException(
          'Item de venda sem identificador numerico valido.',
        );
      }

      if (cditem === null || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      normalized.push({
        ...item,
        idItem:
          item.idItem !== undefined
            ? Math.floor(this.toNumber(item.idItem))
            : undefined,
        cditem,
        quantity,
        unitPrice,
      });
    }

    return normalized;
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
        const importedSaleId = this.parseSaleId(dto.importedSaleId);
        const sale = await tx.t_vendas.findFirst({
          where: {
            autocod_v: importedSaleId,
            cdemp_v: cdemp,
            status_v: 'A',
          },
          select: {
            autocod_v: true,
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
            autocod_v: importedSaleId,
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
          saleId: sale.autocod_v,
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

      const numericCodes = Array.from(
        new Set(items.map((item) => Math.floor(item.cditem))),
      );

      const records = await tx.t_itens.findMany({
        where: {
          cdemp,
          cditem: { in: numericCodes },
        },
        select: {
          cdemp: true,
          cditem: true,
          deitem: true,
          undven: true,
          cdgruit: true,
          precomin: true,
          custo: true,
          preco: true,
          itprodsn: true,
          ativosn: true,
          isdeleted: true,
        },
      });

      if (!records.length) {
        throw new BadRequestException('Nenhum item informado foi encontrado.');
      }

      const byCditem = new Map(
        records.map((record) => [record.cditem, record]),
      );

      const lines = items.map((item) => {
        const record = byCditem.get(item.cditem);
        if (!record) {
          throw new BadRequestException(`Item ${item.cditem} nao encontrado.`);
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

      const formulaParentKeys = Array.from(
        new Set(
          lines
            .filter((line) => this.isYesFlag(line.record.itprodsn))
            .map((line) => `${line.record.cdemp}:${line.record.cditem}`),
        ),
      );

      const formulas = formulaParentKeys.length
        ? await tx.t_formulas.findMany({
            where: {
              OR: formulaParentKeys.map((key) => {
                const [empitem, cditem] = key.split(':').map(Number);
                return { empitem, cditem };
              }),
            },
            orderBy: { autocod: 'asc' },
          })
        : [];

      const formulasByItem = new Map<string, typeof formulas>();
      for (const formula of formulas) {
        const key = `${formula.empitem}:${formula.cditem}`;
        const list = formulasByItem.get(key) ?? [];
        list.push(formula);
        formulasByItem.set(key, list);
      }

      for (const line of lines) {
        if (!this.isYesFlag(line.record.itprodsn)) continue;
        const key = `${line.record.cdemp}:${line.record.cditem}`;
        if (!formulasByItem.get(key)?.length) {
          throw new BadRequestException(
            `Kit ${line.record.cditem} nao possui formula cadastrada.`,
          );
        }
      }

      const materialKeys = Array.from(
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

      const materialRecords = materialKeys.length
        ? await tx.t_itens.findMany({
            where: {
              OR: materialKeys.map((key) => {
                const [empitemmp, matprima] = key.split(':').map(Number);
                return { cdemp: empitemmp, cditem: matprima };
              }),
            },
            select: {
              cdemp: true,
              cditem: true,
              deitem: true,
              undven: true,
              cdgruit: true,
              precomin: true,
              custo: true,
              matprima: true,
              ativosn: true,
              isdeleted: true,
            },
          })
        : [];

      const materialMap = new Map(
        materialRecords.map((record) => [`${record.cdemp}:${record.cditem}`, record]),
      );

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
      const customer =
        dto.clientId?.trim()
          ? await tx.t_cli.findFirst({
              where: {
                cdcli: Math.trunc(this.toNumber(dto.clientId.trim())),
                cdemp,
                OR: [{ isdeleted: false }, { isdeleted: null }],
              },
              select: {
                cdcli: true,
                cdemp: true,
              },
            })
          : null;

      if (dto.clientId?.trim() && !customer) {
        throw new NotFoundException('Cliente nao encontrado para a empresa.');
      }

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
          cdcli_v: customer?.cdcli ?? undefined,
          empcli: customer?.cdemp ?? undefined,
        },
      });

      const parentItsvenLines = lines.map((line) =>
        this.buildItsvenLine({
          cdemp,
          nrven,
          emisven: now,
          vendaId: String(venda.autocod_v),
          item: line.record,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          mp: 'N',
        }),
      );

      const componentItsvenLines: Prisma.t_itsvenUncheckedCreateInput[] = [];

      for (const line of lines) {
        if (!this.isYesFlag(line.record.itprodsn)) {
          continue;
        }

        const formulasForItem =
          formulasByItem.get(`${line.record.cdemp}:${line.record.cditem}`) ?? [];
        const aggregated = new Map<
          string,
          {
            quantity: number;
            empitemmp: number;
            matprima: number;
          }
        >();

        for (const formula of formulasForItem) {
          const empitemmp = this.toNumber(formula.empitemmp);
          const matprima = this.toNumber(formula.matprima);
          const qtdemp = this.toNumber(formula.qtdemp);

          if (!Number.isFinite(empitemmp) || empitemmp <= 0) {
            throw new BadRequestException(
              `Formula do kit ${line.record.cditem} sem empresa da materia-prima.`,
            );
          }
          if (!Number.isFinite(matprima) || matprima <= 0) {
            throw new BadRequestException(
              `Formula do kit ${line.record.cditem} sem materia-prima valida.`,
            );
          }
          if (!Number.isFinite(qtdemp) || qtdemp <= 0) {
            throw new BadRequestException(
              `Formula do kit ${line.record.cditem} com quantidade invalida.`,
            );
          }

          const key = `${empitemmp}:${matprima}`;
          const totalQuantity = this.roundDecimal(qtdemp * line.quantity, 6);
          const current = aggregated.get(key);

          if (current) {
            current.quantity = this.roundDecimal(
              current.quantity + totalQuantity,
              6,
            );
          } else {
            aggregated.set(key, {
              quantity: totalQuantity,
              empitemmp,
              matprima,
            });
          }
        }

        for (const component of aggregated.values()) {
          if (!Number.isFinite(component.quantity) || component.quantity <= 0) {
            throw new BadRequestException(
              `Quantidade invalida para materia-prima ${component.matprima}.`,
            );
          }

          const material = materialMap.get(
            `${component.empitemmp}:${component.matprima}`,
          );
          if (!material) {
            throw new BadRequestException(
              `Materia-prima ${component.matprima} nao encontrada para o kit ${line.record.cditem}.`,
            );
          }
          if (!this.isYesFlag(material.matprima)) {
            throw new BadRequestException(
              `Item ${material.cditem} nao esta marcado como materia-prima.`,
            );
          }
          if (
            !this.isYesFlag(material.ativosn) ||
            material.isdeleted
          ) {
            throw new BadRequestException(
              `Materia-prima ${material.cditem} nao esta ativa para venda.`,
            );
          }

          componentItsvenLines.push(
            this.buildItsvenLine({
              cdemp,
              nrven,
              emisven: now,
              vendaId: String(venda.autocod_v),
              item: material,
              quantity: component.quantity,
              unitPrice: 0,
              mp: 'S',
            }),
          );
        }
      }

      await tx.t_itsven.createMany({ data: parentItsvenLines });
      if (componentItsvenLines.length) {
        await tx.t_itsven.createMany({ data: componentItsvenLines });
      }

      const movestLines = lines.map((line) =>
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
      );

      for (const component of componentItsvenLines) {
        const itemCode = this.toNumber(component.cditem_iv);
        const quantity = this.toNumber(component.qtdesol_iv);
        if (!Number.isFinite(itemCode) || itemCode <= 0) {
          continue;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
          continue;
        }

        movestLines.push(
          this.buildMovestLine({
            cdemp,
            nrven,
            userCode,
            now,
            itemCode,
            quantity,
            unitPrice: 0,
            lineTotal: 0,
            cost: this.toNumber(component.custo_iv),
          }),
        );
      }

      await tx.t_movest.createMany({ data: movestLines });
      await applyMovestBalanceFromCreates(tx, movestLines);

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
        saleId: venda.autocod_v,
        nrven,
        totalVenda,
        totalPago: paymentTotal,
        troco: this.roundMoney(paymentTotal - totalVenda),
      };
    });
  }
}
