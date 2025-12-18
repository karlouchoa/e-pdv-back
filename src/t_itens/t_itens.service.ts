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

    return this.getCompanyId(tenant, prisma);
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

  private async attachSaldo(
    prisma: TenantClient,
    cdemp: number,
    items: Array<{ cditem?: number | null } & Record<string, unknown>>,
  ) {
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
    const cdemp = await this.getCompanyId(tenant, prisma);
  
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
  
    return prisma.t_itens.create({ data });
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

    const page = Math.max(1, Number(getParam('page')) || 1);
    const pageSizeInput = Number(getParam('pageSize'));
    const pageSize =
      Number.isFinite(pageSizeInput) && pageSizeInput > 0
        ? Math.min(pageSizeInput, 100)
        : 10;

    const cdempParam = getParam('cdemp');
    const cdemp = await this.resolveCompanyId(tenant, prisma, cdempParam);

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
          cdempResolved: cdemp,
          page,
          pageSize,
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
      cdemp,
      ...filtersWhere,
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

    const skip = (page - 1) * pageSize;
    const saldoFilter = saldoParam
      ? saldoParam.toString().trim().toUpperCase()
      : null;
    const requiresSaldoFilter = saldoFilter === 'COM' || saldoFilter === 'SEM';

    let balanceItems: Array<{ cditem: number; saldo: number }> = [];

    if (wantSaldo) {
      balanceItems = await this.fetchBalances(prisma, cdemp);

      if (requiresSaldoFilter) {
        balanceItems = balanceItems.filter((b) =>
          saldoFilter === 'COM' ? b.saldo > 0 : b.saldo <= 0,
        );
      }

      const balanceCditems = balanceItems.map((b) => b.cditem);

      if (balanceCditems.length) {
        where.cditem = { in: balanceCditems };
        // não filtramos por cdemp em t_itens; usamos cdemp apenas no saldo
        delete where.cdemp;
      }
    }

    if (!requiresSaldoFilter && !wantSaldo) {
      const [items, total] = await Promise.all([
        prisma.t_itens.findMany({
          where,
          orderBy: [{ cditem: 'asc' }],
          skip,
          take: pageSize,
        }),
        prisma.t_itens.count({ where }),
      ]);

      const itemsWithSaldo = await this.attachSaldo(prisma, cdemp, items);
      const response = { data: itemsWithSaldo, total, count: total, records: total };
      console.log(
        '[t_itens] findAll response (sem filtro de saldo)',
        JSON.stringify(
          {
            cdemp,
            page,
            pageSize,
            total,
            sample: response.data.slice(0, 3),
            where,
          },
          null,
          2,
        ),
      );
      return response;
    }

    // Quando filtra por saldo, precisamos calcular antes de paginar
    const allItems = await prisma.t_itens.findMany({
      where,
      orderBy: [{ cditem: 'asc' }],
    });

    const itemsWithSaldo = await this.attachSaldo(prisma, cdemp, allItems);
    const sampleWithSaldo = itemsWithSaldo
      .slice(0, 5)
      .map((item) => ({ cditem: item.cditem, saldo: item.saldo }));

    const filteredBySaldo = itemsWithSaldo.filter((item) => {
      const saldoValue = this.toOptionalNumber(item.saldo) ?? 0;
      if (saldoFilter === 'COM') return saldoValue > 0;
      if (saldoFilter === 'SEM') return saldoValue <= 0;
      return true;
    });

    const total = filteredBySaldo.length;
    const paginated = filteredBySaldo.slice(skip, skip + pageSize);

    const response = { data: paginated, total, count: total, records: total };
    console.log(
      '[t_itens] findAll response (com filtro de saldo)',
      JSON.stringify(
        {
          cdemp,
          saldoFilter,
          page,
          pageSize,
          total,
          fetchedItems: itemsWithSaldo.length,
          filteredItems: filteredBySaldo.length,
          sampleWithSaldo,
          sample: response.data.slice(0, 3),
          where,
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
    const cdemp = await this.getCompanyId(tenant, prisma);

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

    return this.attachSaldo(prisma, cdemp, results);
  }
  

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    const cditem = this.parseCditem(id);

    return prisma.t_itens.findUnique({
      where: this.buildWhere(cdemp, cditem),
    });
  }


  async update(tenant: string, uuid: string, dto: UpdateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
  
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
    return prisma.t_itens.update({
      where: {
        cdemp_cditem: {
          cdemp,
          cditem,
        },
      },
      data,
    });
  }
  
  
  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    const cditem = this.parseCditem(id);

    return prisma.t_itens.delete({
      where: this.buildWhere(cdemp, cditem),
    });
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
