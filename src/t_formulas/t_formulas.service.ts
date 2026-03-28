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
      where: { empitem: cdemp, cditem },
      orderBy: { autocod: 'asc' },
    });

    if (!formulas.length) {
      throw new NotFoundException(
        `Formula do item ${cditem} nao encontrada para a empresa ${cdemp}`,
      );
    }

    return this.includeMateriaPrima(prisma, formulas);
  }

  private isYesFlag(value: unknown): boolean {
    return String(value ?? '').trim().toUpperCase() === 'S';
  }

  async create(tenant: string, dto: CreateTFormulaDto) {
    const prisma = await this.getPrisma(tenant);
    const fallbackCdemp = await this.getCompanyId(tenant, prisma);
    const empitem = dto.empitem ?? fallbackCdemp;
    const requestedCditem = dto.cditem;

    if (
      dto.idItem !== undefined &&
      Number.isFinite(dto.idItem) &&
      dto.idItem !== requestedCditem
    ) {
      throw new BadRequestException(
        'Os identificadores do item principal estao divergentes.',
      );
    }

    const item = await prisma.t_itens.findFirst({
      where: {
        cdemp: empitem,
        cditem: requestedCditem,
      },
      select: {
        cditem: true,
        cdemp: true,
        undven: true,
        itprodsn: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Item ${requestedCditem} nao encontrado para cadastro da formula.`,
      );
    }

    if (!this.isYesFlag(item.itprodsn)) {
      throw new BadRequestException(
        `Item ${requestedCditem} nao esta marcado como produto com composicao.`,
      );
    }

    const cdemp = item.cdemp ?? fallbackCdemp;
    const cditem = item.cditem ?? requestedCditem;
    const parentEmpitem = item.cdemp ?? empitem;
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
      const materialKeys = Array.from(
        new Set(
          dto.lines.map((line) => `${line.empitemmp}:${line.matprima}`),
        ),
      );

      const materiasPrimas = materialKeys.length
        ? await tx.t_itens.findMany({
            where: {
              OR: materialKeys.map((key) => {
                const [cdempMp, cditemMp] = key.split(':').map(Number);
                return { cdemp: cdempMp, cditem: cditemMp };
              }),
            },
            select: {
              cdemp: true,
              cditem: true,
              deitem: true,
              custo: true,
              preco: true,
              precomin: true,
              matprima: true,
            },
          })
        : [];

      const materiaMap = new Map(
        materiasPrimas.map((mp) => [`${mp.cdemp}:${mp.cditem}`, mp]),
      );

      for (const line of dto.lines) {
        const materiaPrima = materiaMap.get(`${line.empitemmp}:${line.matprima}`);
        if (!materiaPrima) {
          throw new BadRequestException(
            `Materia-prima ${line.matprima} nao encontrada para a empresa ${line.empitemmp}.`,
          );
        }
        if (!this.isYesFlag(materiaPrima.matprima)) {
          throw new BadRequestException(
            `Item ${line.matprima} nao esta marcado como materia-prima.`,
          );
        }
      }

      await tx.t_formulas.deleteMany({
        where: {
          empitem: parentEmpitem,
          cditem,
        },
      });

      const data: Prisma.t_formulasUncheckedCreateInput[] = dto.lines.map(
        (line) => ({
          cdemp,
          cditem,
          empitem: parentEmpitem,
          undven,
          matprima: line.matprima,
          qtdemp: line.qtdemp,
          undmp: line.undmp,
          empitemmp: line.empitemmp,
          deitem_iv: line.deitem_iv,
        }),
      );

      if (dto.updateItemPrices) {
        const explicitPrices = dto.itemPrices
          ? {
              custo: Number(dto.itemPrices.custo),
              preco: Number(dto.itemPrices.preco),
              precomin: Number(dto.itemPrices.precomin),
            }
          : null;

        const hasExplicitPrices =
          explicitPrices !== null &&
          Number.isFinite(explicitPrices.custo) &&
          explicitPrices.custo >= 0 &&
          Number.isFinite(explicitPrices.preco) &&
          explicitPrices.preco >= 0 &&
          Number.isFinite(explicitPrices.precomin) &&
          explicitPrices.precomin >= 0;

        if (explicitPrices !== null && !hasExplicitPrices) {
          throw new BadRequestException(
            'Os precos do kit informados sao invalidos.',
          );
        }

        let totalCusto = 0;
        let totalPreco = 0;
        let totalPrecomin = 0;

        if (hasExplicitPrices && explicitPrices) {
          totalCusto = explicitPrices.custo;
          totalPreco = explicitPrices.preco;
          totalPrecomin = explicitPrices.precomin;
        } else {
          for (const line of dto.lines) {
            const qty = Number(line.qtdemp) || 0;
            const mp = materiaMap.get(`${line.empitemmp}:${line.matprima}`);
            const custo = Number(mp?.custo ?? 0);
            const preco = Number(mp?.preco ?? 0);
            const precomin = Number(mp?.precomin ?? 0);

            totalCusto += custo * qty;
            totalPreco += preco * qty;
            totalPrecomin += precomin * qty;
          }
        }

        await tx.t_itens.updateMany({
          where: {
            cdemp,
            cditem,
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
        where: { empitem: parentEmpitem, cditem },
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

  async findOne(tenant: string, cditem: number) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);
    return this.getFormulasByItem(prisma, cdemp, cditem);
  }

  async remove(tenant: string, cditem: number) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getCompanyId(tenant, prisma);

    const result = await prisma.t_formulas.deleteMany({
      where: { empitem: cdemp, cditem },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        `Formula do item ${cditem} nao encontrada para a empresa ${cdemp}.`,
      );
    }

    return result;
  }

  private async includeMateriaPrima(
    prisma: TenantClient | Prisma.TransactionClient,
    formulas: FormulaModel[],
  ) {
    const materiaPrimaKeys = Array.from(
      new Set(
        formulas
          .map((formula) =>
            typeof formula.matprima === 'number' &&
            typeof formula.empitemmp === 'number'
              ? `${formula.empitemmp}:${formula.matprima}`
              : null,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (materiaPrimaKeys.length === 0) {
      return formulas;
    }

    const materiaPrima = await prisma.t_itens.findMany({
      where: {
        OR: materiaPrimaKeys.map((key) => {
          const [cdemp, cditem] = key.split(':').map(Number);
          return { cdemp, cditem };
        }),
      },
      select: {
        cdemp: true,
        cditem: true,
        deitem: true,
        custo: true,
        undven: true,
        preco: true,
        precomin: true,
      },
    });

    const materiaPrimaMap = new Map(
      materiaPrima.map((item) => [`${item.cdemp}:${item.cditem}`, item]),
    );

    return formulas.map((formula) => ({
      ...formula,
      materiaPrima:
        typeof formula.empitemmp === 'number' &&
        typeof formula.matprima === 'number'
          ? (materiaPrimaMap.get(
              `${formula.empitemmp}:${formula.matprima}`,
            ) ?? null)
          : null,
    }));
  }
}
