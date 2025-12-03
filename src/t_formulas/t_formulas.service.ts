import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
  t_formulas as FormulaModel,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTFormulaDto } from './dto/create-t_formulas.dto';
import { UpdateTFormulaDto } from './dto/update-t_formulas.dto';

interface TFormulasFilters {
  cditem?: number;
}

@Injectable()
export class TFormulasService {
  private readonly defaultCompanyId = 1;
  private readonly companyCache = new Map<string, number>();

  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private async getCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.companyCache.get(tenant);
    if (cached) {
      return cached;
    }

    const firstFormula = await prisma.t_formulas.findFirst({
      select: { cdemp: true },
      orderBy: { autocod: 'asc' },
    });

    const cdemp = firstFormula?.cdemp ?? this.defaultCompanyId;
    this.companyCache.set(tenant, cdemp);
    return cdemp;
  }

  private buildWhere(autocod: number) {
    return { autocod };
  }

  private async ensureFormula(
    prisma: TenantClient,
    cdemp: number,
    autocod: number,
  ) {
    const formula = await prisma.t_formulas.findFirst({
      where: { cdemp, autocod },
    });

    if (!formula) {
      throw new NotFoundException(
        `Formula ${autocod} nao encontrada para a empresa ${cdemp}`,
      );
    }

    return formula;
  }

  async create(tenant: string, dto: CreateTFormulaDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

    const data: Prisma.t_formulasUncheckedCreateInput = {
      cdemp,
      cditem: dto.cditem,
      empitem: dto.empitem,
      undven: dto.undven,
      matprima: dto.matprima,
      qtdemp: dto.qtdemp,
      undmp: dto.undmp,
      empitemmp: dto.empitemmp,
      deitem_iv: dto.deitem_iv,
    };

    return prisma.t_formulas.create({ data });
  }

  async findAll(tenant: string, filters?: TFormulasFilters) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

    const where: Prisma.t_formulasWhereInput = { cdemp };

    if (filters?.cditem !== undefined) {
      where.cditem = filters.cditem;
    }

    const formulas = await prisma.t_formulas.findMany({
      where,
      orderBy: { autocod: 'asc' },
    });

    const enrichedFormulas = await this.includeMateriaPrima(prisma, formulas);

    console.log(
      '[PRISMA] formulas retornadas:',
      JSON.stringify(enrichedFormulas, null, 2),
    );

    if (filters?.cditem !== undefined && enrichedFormulas.length === 0) {
      throw new NotFoundException(
        `Nenhuma formula encontrada para o item ${filters.cditem}`,
      );
    }

    return enrichedFormulas;
  }

  async findOne(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

   
    return this.ensureFormula(prisma, cdemp, id);
  }

  async update(tenant: string, id: number, dto: UpdateTFormulaDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    await this.ensureFormula(prisma, cdemp, id);

    const data: Prisma.t_formulasUncheckedUpdateInput = {
      ...dto,
    };

    return prisma.t_formulas.update({
      where: this.buildWhere(id),
      data,
    });
  }

  async remove(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    await this.ensureFormula(prisma, cdemp, id);

    return prisma.t_formulas.delete({
      where: this.buildWhere(id),
    });
  }

  private async includeMateriaPrima(
    prisma: TenantClient,
    formulas: FormulaModel[],
  ) {
    const materiaPrimaIds = Array.from(
      new Set(
        formulas
          .map((formula) => formula.matprima)
          .filter((value): value is number => typeof value === 'number'),
      ),
    );

    if (materiaPrimaIds.length === 0) {
      return formulas;
    }

    const materiaPrima = await prisma.t_itens.findMany({
      where: { cditem: { in: materiaPrimaIds } },
      select: {
        cditem: true,
        deitem: true,
        custo: true,
        undven: true,
      },
    });

    const materiaPrimaMap = new Map(
      materiaPrima.map((item) => [item.cditem, item]),
    );

    return formulas.map((formula) => ({
      ...formula,
      materiaPrima: materiaPrimaMap.get(formula.matprima) ?? null,
    }));
  }
}

