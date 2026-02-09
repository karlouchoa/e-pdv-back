import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateProductBDto } from './dto/create-product-b.dto';
import { FormulaItemDto } from './dto/formula-item.dto';
import { UpdateProductBDto } from './dto/update-product-b.dto';
import { ProductBaseService } from './product-base.service';

@Injectable()
export class ProductBService extends ProductBaseService {
  constructor(tenantDbService: TenantDbService) {
    super(tenantDbService);
  }

  async create(tenant: string, dto: CreateProductBDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    if (!Array.isArray(dto.formulaItems) || dto.formulaItems.length === 0) {
      throw new BadRequestException('formulaItems nao pode ser vazio.');
    }

    const data = this.mapBaseCreateData(dto, cdemp, {
      itprodsn: 'S',
      comboSN: 'N',
    });

    return prisma.$transaction(async (tx) => {
      const item = await tx.t_itens.create({ data });
      const itemId = this.ensureItemId(item);

      const normalized = this.normalizeFormulaItems(
        dto.formulaItems,
        item.cditem,
      );

      const formulaData = this.buildFormulaData(
        normalized,
        itemId,
        cdemp,
        item.undven ?? 'UN',
        item.cditem,
      );

      await tx.t_formulas.createMany({ data: formulaData });

      return { item, formulas: formulaData };
    });
  }

  async update(tenant: string, id: string, dto: UpdateProductBDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);

    const hasFormulaInput = Array.isArray(dto.formulaItems);
    await this.assertTypeB(prisma, item, !hasFormulaInput);

    const data = this.mapBaseUpdateData(dto, {
      itprodsn: 'S',
      comboSN: 'N',
    });

    if (!hasFormulaInput) {
      const updated = await prisma.t_itens.update({
        where: {
          cdemp_cditem: {
            cdemp,
            cditem: item.cditem,
          },
        },
        data,
      });

      return { item: updated };
    }

    if (!dto.formulaItems || dto.formulaItems.length === 0) {
      throw new BadRequestException('formulaItems nao pode ser vazio.');
    }

    const normalized = this.normalizeFormulaItems(
      dto.formulaItems,
      item.cditem,
    );

    return prisma.$transaction(async (tx) => {
      const updated = await tx.t_itens.update({
        where: {
          cdemp_cditem: {
            cdemp,
            cditem: item.cditem,
          },
        },
        data,
      });

      const itemId = this.ensureItemId(item);
      await tx.t_formulas.deleteMany({ where: { ID_ITEM: itemId } });

      const formulaData = this.buildFormulaData(
        normalized,
        itemId,
        cdemp,
        updated.undven ?? item.undven ?? 'UN',
        item.cditem,
      );

      await tx.t_formulas.createMany({ data: formulaData });

      return { item: updated, formulas: formulaData };
    });
  }

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);
    await this.assertTypeB(prisma, item, true);
    await this.ensureNoSalesDependencies(prisma, item.cditem);

    return prisma.$transaction(async (tx) => {
      const itemId = this.ensureItemId(item);
      await tx.t_formulas.deleteMany({ where: { ID_ITEM: itemId } });

      const updated = await tx.t_itens.update({
        where: {
          cdemp_cditem: {
            cdemp,
            cditem: item.cditem,
          },
        },
        data: {
          isdeleted: true,
          ativosn: 'N',
          ativoprod: 'N',
          updatedat: new Date(),
        },
      });

      return { item: updated };
    });
  }

  private normalizeFormulaItems(items: FormulaItemDto[], itemCditem: number) {
    const normalized = items.map((formula, index) => {
      const matprima = this.toOptionalNumber(
        formula.matprimaId ?? formula.cditem_matprima,
      );

      if (matprima === null) {
        throw new BadRequestException(
          `formulaItems[${index}].matprimaId e obrigatorio.`,
        );
      }

      if (matprima === itemCditem) {
        throw new BadRequestException(
          `formulaItems[${index}] nao pode referenciar o proprio item.`,
        );
      }

      const quantity = formula.quantity;
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `formulaItems[${index}].quantity deve ser maior que zero.`,
        );
      }

      const unit = formula.unit?.trim();
      if (!unit) {
        throw new BadRequestException(
          `formulaItems[${index}].unit e obrigatorio.`,
        );
      }

      return {
        matprima,
        quantity,
        unit,
      };
    });

    const seen = new Set<number>();
    for (const formula of normalized) {
      if (seen.has(formula.matprima)) {
        throw new BadRequestException('matprima duplicada na formula.');
      }
      seen.add(formula.matprima);
    }

    return normalized;
  }

  private buildFormulaData(
    items: Array<{ matprima: number; quantity: number; unit: string }>,
    itemId: string,
    cdemp: number,
    undven: string,
    cditem: number,
  ): Prisma.t_formulasCreateManyInput[] {
    return items.map((formula) => ({
      cdemp,
      cditem,
      empitem: cdemp,
      undven,
      matprima: formula.matprima,
      qtdemp: formula.quantity,
      undmp: formula.unit,
      empitemmp: cdemp,
      deitem_iv: null,
      ID_ITEM: itemId,
    }));
  }

  private async assertTypeB(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    item: Awaited<ReturnType<ProductBaseService['findItemById']>>,
    requireFormula: boolean,
  ) {
    if (item.itprodsn !== 'S') {
      throw new BadRequestException('Item nao marcado como produto composto.');
    }

    if (item.ComboSN === 'S') {
      throw new BadRequestException('Item pertence a produtos combo.');
    }

    const itemId = this.ensureItemId(item);
    const { formulaCount, comboCount } = await this.getRelationCounts(
      prisma,
      itemId,
    );

    if (comboCount > 0) {
      throw new BadRequestException(
        'Produto composto nao pode ter comboRules.',
      );
    }

    if (requireFormula && formulaCount === 0) {
      throw new BadRequestException(
        'Produto composto sem formulas cadastradas.',
      );
    }
  }

  private async ensureNoSalesDependencies(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    cditem: number,
  ) {
    const hasSales = await prisma.t_itsven.findFirst({
      where: { cditem_iv: cditem },
      select: { registro: true },
    });

    if (hasSales) {
      throw new BadRequestException(
        'Produto possui vendas vinculadas e nao pode ser removido.',
      );
    }

    const hasMovements = await prisma.t_movest.findFirst({
      where: { cditem },
      select: { nrlan: true },
    });

    if (hasMovements) {
      throw new BadRequestException(
        'Produto possui movimentacoes de estoque e nao pode ser removido.',
      );
    }
  }
}
