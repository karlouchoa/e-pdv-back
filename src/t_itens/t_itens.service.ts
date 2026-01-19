import { BadRequestException, Injectable } from '@nestjs/common';
import {
  TenantPrisma as Prisma,
  type TenantClient,
} from '../lib/prisma-clients';
import type { Prisma as PrismaTypes } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTItemDto } from './dto/create-t_itens.dto';
import { UpdateTItemDto } from './dto/update-t_itens.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class TItensService {
  private readonly defaultCompanyId = 1;
  private readonly companyCache = new Map<string, number>();
  private readonly matrizCompanyCache = new Map<string, number>();
  private readonly reservedFilters = new Set(['cdemp']);
  private readonly scalarFieldMap = new Map(
    Object.values(Prisma.T_itensScalarFieldEnum).map((field) => [
      field.toLowerCase(),
      field,
    ]),
  );

  constructor(private readonly tenantDbService: TenantDbService) {}

  private isGuid(value: string) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  }

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private async getCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.companyCache.get(tenant);
    if (cached) return cached;

    const firstItem = await prisma.t_itens.findFirst({
      select: { cdemp: true },
      orderBy: { cditem: 'asc' },
    });

    const cdemp = firstItem?.cdemp ?? this.defaultCompanyId;
    this.companyCache.set(tenant, cdemp);
    return cdemp;
  }

  private async getMatrizCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.matrizCompanyCache.get(tenant);
    if (cached) return cached;

    const matriz = await prisma.t_emp.findFirst({
      where: { matriz: 'S' },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    const cdemp = matriz?.cdemp ?? this.defaultCompanyId;
    this.matrizCompanyCache.set(tenant, cdemp);
    return cdemp;
  }

  private async resolveCompanyId(
    tenant: string,
    prisma: TenantClient,
    cdempParam?: unknown,
  ): Promise<number> {
    const parsed = this.toOptionalNumber(cdempParam);
    if (parsed !== null) {
      return parsed;
    }

    const candidate =
      typeof cdempParam === 'string' ? cdempParam.trim() : undefined;

    if (candidate) {
      let company: { cdemp: number } | null = null;

      if (this.isGuid(candidate)) {
        company = await prisma.t_emp.findFirst({
          where: { ID: candidate },
          select: { cdemp: true },
        });
      }

      if (!company) {
        company = await prisma.t_emp.findFirst({
          where: {
            OR: [
              { numemp: candidate },
              { apelido: candidate },
              { deemp: candidate },
            ],
          },
          select: { cdemp: true },
        });
      }

      if (company?.cdemp !== undefined && company.cdemp !== null) {
        return company.cdemp;
      }
    }

    // fallback: usa o primeiro cdemp que tem saldo lançado
    const saldoCompany = await prisma.t_saldoit.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });
    if (saldoCompany?.cdemp !== undefined && saldoCompany.cdemp !== null) {
      return saldoCompany.cdemp;
    }

    // fallback adicional: primeiro cdemp em t_emp
    const anyCompany = await prisma.t_emp.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });
    if (anyCompany?.cdemp !== undefined && anyCompany.cdemp !== null) {
      return anyCompany.cdemp;
    }

    return this.getMatrizCompanyId(tenant, prisma);
  }

  /** -------------------------
   *     CRUD PRINCIPAL
   *  ------------------------- */

  private parseCditem(id: string) {
    const cditem = Number(id);
    if (!Number.isFinite(cditem)) {
      throw new BadRequestException('O identificador do item precisa ser numerico.');
    }
    return cditem;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numeric =
      typeof value === 'object' && (value as any)?.valueOf
        ? Number((value as any).valueOf())
        : Number(value);

    if (Number.isNaN(numeric)) {
      return null;
    }

    return numeric;
  }

  private ensureCdemp<T extends Record<string, unknown>>(
    item: T,
    fallbackCdemp: number | null,
  ): T & { cdemp: number | null } {
    const current = this.toOptionalNumber(
      (item as { cdemp?: unknown }).cdemp,
    );
    if (current !== null) {
      return { ...item, cdemp: current };
    }

    return { ...item, cdemp: fallbackCdemp };
  }

  private ensureCdempList<T extends Record<string, unknown>>(
    items: T[],
    fallbackCdemp: number | null,
  ) {
    return items.map((item) => this.ensureCdemp(item, fallbackCdemp));
  }

  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value !== 'string') return Boolean(value);

    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'sim', 's', 'all', 'todos'].includes(
      normalized,
    );
  }

  private buildWhere(
    cdemp: number,
    cditem: number,
  ): PrismaTypes.t_itensWhereUniqueInput {
    return {
      cdemp_cditem: {
        cdemp,
        cditem,
      },
    };
  }

  private async attachSaldo<T extends { cditem?: number | null }>(
    prisma: TenantClient,
    cdemp: number,
    items: T[],
  ): Promise<Array<T & { saldo: number | null }>> {
    const ids = items
      .map((item) => item.cditem)
      .filter((id): id is number => typeof id === 'number');

    if (!ids.length) {
      return items.map((item) => ({ ...item, saldo: null }));
    }

    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where: {
        cdemp,
        cditem: { in: ids },
      },
      _sum: { saldo: true },
    });

    const balanceMap = new Map<number, number | null>();
    for (const entry of balances) {
      balanceMap.set(entry.cditem, this.toOptionalNumber(entry._sum.saldo));
    }

    return items.map((item) => ({
      ...item,
      saldo: balanceMap.get(item.cditem ?? -1) ?? null,
    }));
  }

  private async fetchBalances(
    prisma: TenantClient,
    cdemp: number,
    cditems?: number[],
  ) {
    const where: PrismaTypes.t_saldoitWhereInput = {
      cdemp,
      ...(cditems?.length ? { cditem: { in: cditems } } : {}),
    };

    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where,
      _sum: { saldo: true },
    });

    return balances.map((entry) => ({
      cditem: entry.cditem,
      saldo: this.toOptionalNumber(entry._sum.saldo) ?? 0,
    }));
  }

  async create(tenant: string, dto: CreateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
  
    const data = {
      cdemp,
  
      // mapeamento DTO → banco
      deitem: dto.name,
      defat: dto.description ?? "",
      undven: dto.unit ?? "UN",
      cdgruit: dto.category ? Number(dto.category) : null,
  
      preco: dto.salePrice ?? 0,
      custo: dto.costPrice ?? 0,
  
      codncm: dto.ncm || null,
      cest: dto.cest || null,
      codcst: dto.cst || null,
      barcodeit: dto.barcode || null,
  
      diasent: dto.leadTimeDays ?? 0,
  
      itprodsn: dto.itprodsn ?? "N",
      matprima: dto.matprima ?? "N",
  
      obsitem: dto.notes ?? null,
      locfotitem: dto.imagePath ?? null,
  
      // defaults obrigatórios
      ativosn: "S",
      negativo: "S",
      aceitadesc: "S",
  
      qtembitem: 0,
      pesobr: 0,
      pesolq: 0,
      eminitem: 0,
      emaxitem: 0,
      percipi: 0,
      valcmp: 0,
      precomin: 0,
      percom: 0,
      sldatual: 0,
  
      datacadit: new Date(),
      updatedat: new Date(),
    };
  
    const created = await prisma.t_itens.create({ data });
    return this.ensureCdemp(created, cdemp);
  }
  
  async findAll(
    tenant: string,
    filters?: Record<string, string | string[]>,
  ) {
    const prisma = await this.getPrisma(tenant);

    const getParam = (key: string) => {
      const value = filters?.[key];
      return Array.isArray(value) ? value[value.length - 1] : value;
    };

    const pageInput = Number(getParam('page'));
    const page =
      Number.isFinite(pageInput) && pageInput > 0 ? Math.floor(pageInput) : 1;
    const pageSizeRaw = getParam('pageSize');
    const pageSizeInput = Number(pageSizeRaw);
    const allParam = getParam('all');
    const wantsAll =
      this.isTruthy(allParam) ||
      (typeof pageSizeRaw === 'string' &&
        pageSizeRaw.trim().toLowerCase() === 'all') ||
      pageSizeInput === 0;
    const pageSize = wantsAll
      ? null
      : Number.isFinite(pageSizeInput) && pageSizeInput > 0
        ? Math.min(pageSizeInput, 100)
        : 10;

    const cdempParam = getParam('cdemp');
    const saldoCdemp = await this.resolveCompanyId(tenant, prisma, cdempParam);
    const itemsCdemp = await this.getMatrizCompanyId(tenant, prisma);

    const descricaoPrefix = getParam('descricaoPrefix');
    const cdgruitParam = getParam('cdgruit');
    const matprimaParam = getParam('matprima');
    const saldoParam = getParam('saldo');
    const includeSaldoParam = getParam('includeSaldo');
    const wantSaldo =
      (typeof includeSaldoParam === 'string'
        ? includeSaldoParam.toLowerCase() === 'true'
        : Boolean(includeSaldoParam)) || !!saldoParam;
    const filtersWhere = this.buildFilters(filters);

    console.log(
      '[t_itens] findAll input',
      JSON.stringify(
        {
          tenant,
          cdempParam,
          cdempResolved: itemsCdemp,
          cdempSaldo: saldoCdemp,
          page,
          pageSize,
          wantsAll,
          descricaoPrefix,
          cdgruit: cdgruitParam,
          matprima: matprimaParam,
          saldo: saldoParam,
          includeSaldo: wantSaldo,
          extraFilters: filtersWhere,
        },
        null,
        2,
      ),
    );

    const where: PrismaTypes.t_itensWhereInput = {
      cdemp: itemsCdemp,
      ...filtersWhere,
    };
    const includeCategoria = {
      categoria: {
        select: {
          cdgru: true,
          degru: true,
        },
      },
    };

    if (descricaoPrefix && descricaoPrefix.trim()) {
      where.deitem = {
        startsWith: descricaoPrefix.trim(),
      };
    }

    const cdgruit = Number(cdgruitParam);
    if (Number.isFinite(cdgruit)) {
      where.cdgruit = cdgruit;
    }

    const matprima = matprimaParam?.toString().trim().toUpperCase();
    if (matprima === 'S' || matprima === 'N') {
      where.matprima = matprima;
    }

    const skip = wantsAll || pageSize === null ? 0 : (page - 1) * pageSize;
    const saldoFilter = saldoParam
      ? saldoParam.toString().trim().toUpperCase()
      : null;
    const requiresSaldoFilter = saldoFilter === 'COM' || saldoFilter === 'SEM';

    if (!requiresSaldoFilter) {
      const findManyArgs: PrismaTypes.t_itensFindManyArgs = {
        where,
        orderBy: [{ cditem: 'asc' }],
        include: includeCategoria,
      };

      if (!wantsAll && pageSize !== null) {
        findManyArgs.skip = skip;
        findManyArgs.take = pageSize;
      }

    const [items, total] = await Promise.all([
      prisma.t_itens.findMany(findManyArgs),
      prisma.t_itens.count({ where }),
    ]);

      const itemsWithSaldo = await this.attachSaldo(prisma, saldoCdemp, items);
      const ensuredItems = this.ensureCdempList(itemsWithSaldo, itemsCdemp);
      const response = { data: ensuredItems, total, count: total, records: total };
      console.log(
        '[t_itens] findAll response (sem filtro de saldo)',
        JSON.stringify(
          {
            cdemp: itemsCdemp,
            cdempSaldo: saldoCdemp,
            page,
            pageSize,
            wantsAll,
            total,
            sample: response.data.slice(0, 3),
            where,
            wantSaldo,
          },
          null,
          2,
        ),
      );
      return response;
    }

    const balances = await this.fetchBalances(prisma, saldoCdemp);
    const filteredBalances = balances.filter((b) =>
      saldoFilter === 'COM' ? b.saldo > 0 : b.saldo <= 0,
    );

    if (!filteredBalances.length) {
      const emptyResponse = { data: [], total: 0, count: 0, records: 0 };
      console.log(
        '[t_itens] findAll response (com filtro de saldo vazio)',
        JSON.stringify(
          {
            cdemp: itemsCdemp,
            cdempSaldo: saldoCdemp,
            saldoFilter,
            page,
            pageSize,
            total: 0,
            where,
          },
          null,
          2,
        ),
      );
      return emptyResponse;
    }

    const saldoMap = new Map<number, number | null>();
    for (const entry of filteredBalances) {
      saldoMap.set(entry.cditem, this.toOptionalNumber(entry.saldo) ?? 0);
    }

    const cditemsToFetch = [...saldoMap.keys()];
    const chunkSize = 1500; // abaixo do limite de 2100 parametros do SQL Server
    type Item = PrismaTypes.t_itensGetPayload<PrismaTypes.t_itensFindManyArgs>;
    const filteredItems: Item[] = [];

    for (let i = 0; i < cditemsToFetch.length; i += chunkSize) {
      const chunkCditems = cditemsToFetch.slice(i, i + chunkSize);
      const chunkWhere: PrismaTypes.t_itensWhereInput = {
        ...where,
        cditem: { in: chunkCditems },
      };

      const chunkItems = await prisma.t_itens.findMany({
        where: chunkWhere,
        orderBy: [{ cditem: 'asc' }],
        include: includeCategoria,
      });

      filteredItems.push(...chunkItems);
    }

    filteredItems.sort((a, b) => (a.cditem ?? 0) - (b.cditem ?? 0));

    const itemsWithSaldo = filteredItems.map((item) => ({
      ...item,
      saldo: saldoMap.get(item.cditem ?? -1) ?? null,
    }));
    const ensuredItems = this.ensureCdempList(itemsWithSaldo, itemsCdemp);

    const total = ensuredItems.length;
    const paginated =
      wantsAll || pageSize === null
        ? ensuredItems
        : ensuredItems.slice(skip, skip + pageSize);

    const response = { data: paginated, total, count: total, records: total };
    console.log(
      '[t_itens] findAll response (com filtro de saldo)',
      JSON.stringify(
        {
          cdemp: itemsCdemp,
          cdempSaldo: saldoCdemp,
          saldoFilter,
          page,
          pageSize,
          wantsAll,
          total,
          fetchedItems: filteredItems.length,
          filteredItems: itemsWithSaldo.length,
          sample: response.data.slice(0, 3).map((item) => ({
            cditem: item.cditem,
            saldo: item.saldo,
          })),
          where: { ...where, cditemCount: cditemsToFetch.length },
        },
        null,
        2,
      ),
    );
    return response;
  }

  async searchByDescription(tenant: string, description?: string) {
    const term = description?.trim();
    if (!term) {
      throw new BadRequestException('Parametro "description" obrigatorio.');
    }
    console.log('[searchByDescription] term:', term);

    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const isNumeric = /^\d+$/.test(term);

    const results = await prisma.t_itens.findMany({
      where: isNumeric
        ? {
            cdemp,
            cditem: Number(term),
          }
        : {
            cdemp,
            deitem: { startsWith: term },
          },
      orderBy: { deitem: 'asc' },
    });

    const itemsWithSaldo = await this.attachSaldo(prisma, cdemp, results);
    return this.ensureCdempList(itemsWithSaldo, cdemp);
  }
  

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const cditem = this.parseCditem(id);

    const item = await prisma.t_itens.findUnique({
      where: this.buildWhere(cdemp, cditem),
    });
    return item ? this.ensureCdemp(item, cdemp) : item;
  }


  async update(tenant: string, uuid: string, dto: UpdateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
  
    // 1️⃣ Buscar o item pelo UUID
    const existing = await prisma.t_itens.findFirst({
      where: {
        cdemp,
        ID: uuid, // <-- UUID verdadeiro
      },
    });
  
    if (!existing) {
      throw new Error('Item não encontrado para este tenant.');
    }
  
    const cditem = existing.cditem; // <- chave real
  
    // 2️⃣ Construir data de atualização
    const data: any = {
      deitem: dto.name,
      defat: dto.description,
      undven: dto.unit,
      mrcitem: dto.marca,
      cdgruit: dto.category ? Number(dto.category) : undefined,
  
      preco: dto.salePrice,
      custo: dto.costPrice,
      valcmp: dto.valcmp,
      margem: dto.margem,
  
      codncm: dto.ncm,
      cest: dto.cest,
      codcst: dto.cst,
      barcodeit: dto.barcode,

      diasent: dto.leadTimeDays,
      qtembitem: dto.qtembitem,

      itprodsn: dto.itprodsn,
      matprima: dto.matprima,
  
      obsitem: dto.notes,
      locfotitem: dto.imagePath,
  
      updatedat: new Date(),
    };
  
    // Remove undefined
    Object.keys(data).forEach(
      key => data[key] === undefined && delete data[key],
    );
  
    // 3️⃣ UPDATE via PK composta (cdemp + cditem)
    const updated = await prisma.t_itens.update({
      where: {
        cdemp_cditem: {
          cdemp,
          cditem,
        },
      },
      data,
    });
    return this.ensureCdemp(updated, cdemp);
  }
  
  
  async remove(tenant: string, id: string, cdempInput: unknown) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = this.toOptionalNumber(cdempInput);
    if (cdemp === null) {
      throw new BadRequestException('O campo cdemp deve ser numerico.');
    }

    const existing = await prisma.t_itens.findFirst({
      where: {
        cdemp,
        ID: id,
      },
      select: { cditem: true },
    });

    if (!existing) {
      throw new NotFoundException('Item nao encontrado para este tenant.');
    }

    const hasMovements = await prisma.t_movest.findFirst({
      where: {
        cdemp,
        cditem: existing.cditem,
      },
      select: { nrlan: true },
    });

    if (hasMovements) {
      throw new BadRequestException(
        'Item possui movimentacoes em estoque e nao pode ser excluido.',
      );
    }

    const updated = await prisma.t_itens.update({
      where: {
        cdemp_cditem: {
          cdemp,
          cditem: existing.cditem,
        },
      },
      data: {
        isdeleted: true,
        ativosn: 'N',
        ativoprod: 'N',
        updatedat: new Date(),
      },
    });
    return this.ensureCdemp(updated, cdemp);
  }


  

  /** -------------------------
   *     FILTROS E TRATAMENTO
   *  ------------------------- */

  private sanitizeFilterValue(
    value: string | string[],
  ): { value: string; wasQuoted: boolean } | undefined {
    if (value === undefined || value === null) return undefined;

    const raw = Array.isArray(value) ? value[value.length - 1] : value;
    const trimmed = `${raw}`.trim();
    if (!trimmed) return undefined;

    const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
    const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');

    if (hasSingleQuotes || hasDoubleQuotes) {
      return { value: trimmed.slice(1, -1), wasQuoted: true };
    }

    return { value: trimmed, wasQuoted: false };
  }

  private tryCoerceValue(
    value: { value: string; wasQuoted: boolean },
  ): string | number {
    if (value.wasQuoted) return value.value;

    const numeric = Number(value.value);
    if (!Number.isNaN(numeric) && value.value !== '') {
      return numeric;
    }

    return value.value;
  }

  private buildFilters(
    filters?: Record<string, string | string[]>,
  ): PrismaTypes.t_itensWhereInput {
    const where: PrismaTypes.t_itensWhereInput = {};
    if (!filters) return where;

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      const normalizedKey = rawKey.trim().toLowerCase();
      if (!normalizedKey || this.reservedFilters.has(normalizedKey)) continue;

      const mappedField = this.scalarFieldMap.get(normalizedKey);
      if (!mappedField) continue;

      const sanitized = this.sanitizeFilterValue(rawValue);
      if (!sanitized) continue;

      const coerced = this.tryCoerceValue(sanitized);
      (where as Record<string, unknown>)[mappedField] = coerced;
    }

    return where;
  }
}
