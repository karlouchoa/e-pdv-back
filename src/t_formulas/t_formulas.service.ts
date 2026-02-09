import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
  t_formulas as FormulaModel,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTFormulaDto } from './dto/create-t_formulas.dto';

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

  private async getFormulasByItem(
    prisma: TenantClient,
    cdemp: number,
    cditem: number,
  ) {
    const formulas = await prisma.t_formulas.findMany({
      where: { cdemp, cditem },
      orderBy: { autocod: 'asc' },
    });

    if (!formulas.length) {
      throw new NotFoundException(
        `Formula do item ${cditem} nao encontrada para a empresa ${cdemp}`,
      );
    }

    return this.includeMateriaPrima(prisma, formulas);
  }

  private async getFormulasByItemId(prisma: TenantClient, idItem: string) {
    const formulas = await prisma.t_formulas.findMany({
      where: { ID_ITEM: idItem },
      orderBy: { autocod: 'asc' },
    });

    if (!formulas.length) {
      throw new NotFoundException(`Formula do item ${idItem} nao encontrada.`);
    }

    return this.includeMateriaPrima(prisma, formulas);
  }

  async create(tenant: string, dto: CreateTFormulaDto) {
    const prisma = await this.getPrisma(tenant);
    const item = await prisma.t_itens.findFirst({
      where: { ID: dto.idItem },
      select: {
        cditem: true,
        cdemp: true,
        undven: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Item ${dto.idItem} nao encontrado para cadastro da formula.`,
      );
    }

    const cdemp = item.cdemp ?? (await this.getCompanyId(tenant, prisma));
    const cditem = item.cditem ?? dto.cditem;
    const empitem = dto.empitem ?? cdemp;
    const undven = item.undven ?? dto.undven;

    if (!dto.lines?.length) {
      throw new BadRequestException('Informe ao menos uma materia-prima.');
    }

    const invalidLine = dto.lines.find(
      (line) =>
        !Number.isFinite(line.matprima) ||
        !Number.isFinite(line.qtdemp) ||
        line.qtdemp <= 0,
    );

    if (invalidLine) {
      throw new BadRequestException('Revise os dados das materias-primas.');
    }

    return prisma.$transaction(async (tx) => {
      await tx.t_formulas.deleteMany({
        where: {
          ID_ITEM: dto.idItem,
        },
      });

      const data: Prisma.t_formulasUncheckedCreateInput[] = dto.lines.map(
        (line) => ({
          cdemp,
          cditem,
          empitem,
          undven,
          matprima: line.matprima,
          qtdemp: line.qtdemp,
          undmp: line.undmp,
          empitemmp: line.empitemmp,
          deitem_iv: line.deitem_iv,
          ID_ITEM: dto.idItem,
        }),
      );

      if (dto.updateItemPrices) {
        const matprimaIds = Array.from(
          new Set(
            dto.lines
              .map((line) => line.matprima)
              .filter((id) => Number.isFinite(id)),
          ),
        );

        if (matprimaIds.length === 0) {
          throw new BadRequestException(
            'Nao foi possivel calcular custos: nenhuma materia-prima valida encontrada.',
          );
        }

        const materiasPrimas = await tx.t_itens.findMany({
          where: { cditem: { in: matprimaIds } },
          select: { cditem: true, custo: true, preco: true, precomin: true },
        });

        const materiaMap = new Map(materiasPrimas.map((mp) => [mp.cditem, mp]));

        let totalCusto = 0;
        let totalPreco = 0;
        let totalPrecomin = 0;

        for (const line of dto.lines) {
          const qty = Number(line.qtdemp) || 0;
          const mp = materiaMap.get(line.matprima);
          const custo = Number(mp?.custo ?? 0);
          const preco = Number(mp?.preco ?? 0);
          const precomin = Number(mp?.precomin ?? 0);

          totalCusto += custo * qty;
          totalPreco += preco * qty;
          totalPrecomin += precomin * qty;
        }

        await tx.t_itens.updateMany({
          where: {
            OR: [{ ID: dto.idItem }, { cdemp, cditem }],
          },
          data: {
            custo: totalCusto,
            preco: totalPreco,
            precomin: totalPrecomin,
            updatedat: new Date(),
          },
        });
      }

      await tx.t_formulas.createMany({ data });

      const created = await tx.t_formulas.findMany({
        where: { ID_ITEM: dto.idItem },
        orderBy: { autocod: 'asc' },
      });

      return this.includeMateriaPrima(tx, created);
    });
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

    // console.log('[PRISMA] formulas retornadas:',
    //   JSON.stringify(enrichedFormulas, null, 2),
    // );

    if (filters?.cditem !== undefined && enrichedFormulas.length === 0) {
      throw new NotFoundException(
        `Nenhuma formula encontrada para o item ${filters.cditem}`,
      );
    }

    return enrichedFormulas;
  }

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    return this.getFormulasByItemId(prisma, id);
  }

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);

    const result = await prisma.t_formulas.deleteMany({
      where: { ID_ITEM: id },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Formula do item ${id} nao encontrada.`);
    }

    return result;
  }

  private async includeMateriaPrima(
    prisma: TenantClient | Prisma.TransactionClient,
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
        preco: true,
        precomin: true,
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
