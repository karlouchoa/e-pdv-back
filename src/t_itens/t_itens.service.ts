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

  async create(tenant: string, dto: CreateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

    const data: PrismaTypes.t_itensUncheckedCreateInput = {
      cdemp,
      deitem: dto.deitem,
      barcodeit: dto.barcodeit,
      preco: dto.preco,
      // demais campos opcionais
    };

    return prisma.t_itens.create({ data });
  }

  async findAll(
    tenant: string,
    filters?: Record<string, string | string[]>,
  ) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

    return prisma.t_itens.findMany({
      where: {
        cdemp,
        ...this.buildFilters(filters),
      },
      orderBy: { cditem: 'asc' },
    });
  }

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    const cditem = this.parseCditem(id);

    return prisma.t_itens.findUnique({
      where: this.buildWhere(cdemp, cditem),
    });
  }


  async update(tenant: string, id: string, dto: UpdateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
  
    // 1) Buscar o item pelo GUID + empresa
    const existing = await prisma.t_itens.findFirst({
      where: {
        ID: id,
        cdemp,
      },
      select: {
        cditem: true,
      },
    });
  
    if (!existing) {
      throw new NotFoundException('Item não encontrado para este identificador.');
    }
  
    // 2) Montar o payload de update
    const data: PrismaTypes.t_itensUncheckedUpdateInput = {
      ...dto,
      updatedat: new Date(),
    };
  
    // 3) Atualizar usando a PK composta
    return prisma.t_itens.update({
      where: {
        cdemp_cditem: {
          cdemp,
          cditem: existing.cditem,
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
