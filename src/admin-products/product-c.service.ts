import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { ComboRuleDto } from './dto/combo-rule.dto';
import { CreateProductCDto } from './dto/create-product-c.dto';
import { UpdateProductCDto } from './dto/update-product-c.dto';
import { ProductBaseService } from './product-base.service';

@Injectable()
export class ProductCService extends ProductBaseService {
  constructor(tenantDbService: TenantDbService) {
    super(tenantDbService);
  }

  async create(tenant: string, dto: CreateProductCDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    if (!Array.isArray(dto.comboRules) || dto.comboRules.length === 0) {
      throw new BadRequestException('comboRules nao pode ser vazio.');
    }

    const data = this.mapBaseCreateData(dto, cdemp, {
      itprodsn: 'N',
      comboSN: 'S',
    });

    return prisma.$transaction(async (tx) => {
      const item = await tx.t_itens.create({ data });
      const itemId = this.ensureItemId(item);

      const normalized = this.normalizeComboRules(dto.comboRules);
      const comboData = this.buildComboData(normalized, itemId);

      await tx.t_ItensCombo.createMany({ data: comboData });

      return { item, comboRules: comboData };
    });
  }

  async update(tenant: string, id: string, dto: UpdateProductCDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);

    const hasComboInput = Array.isArray(dto.comboRules);
    await this.assertTypeC(prisma, item, !hasComboInput);

    const data = this.mapBaseUpdateData(dto, {
      itprodsn: 'N',
      comboSN: 'S',
    });

    if (!hasComboInput) {
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

    if (!dto.comboRules || dto.comboRules.length === 0) {
      throw new BadRequestException('comboRules nao pode ser vazio.');
    }

    const normalized = this.normalizeComboRules(dto.comboRules);

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
      await tx.t_ItensCombo.deleteMany({ where: { ID_ITEM: itemId } });

      const comboData = this.buildComboData(normalized, itemId);
      await tx.t_ItensCombo.createMany({ data: comboData });

      return { item: updated, comboRules: comboData };
    });
  }

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);
    await this.assertTypeC(prisma, item, true);

    return prisma.$transaction(async (tx) => {
      const itemId = this.ensureItemId(item);
      await tx.t_ItensCombo.deleteMany({ where: { ID_ITEM: itemId } });

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

  private normalizeComboRules(items: ComboRuleDto[]) {
    const normalized = items.map((rule, index) => {
      const cdgru = this.toOptionalNumber(rule.cdgru);
      if (cdgru === null) {
        throw new BadRequestException(
          `comboRules[${index}].cdgru e obrigatorio.`,
        );
      }

      const qtde = rule.qtde;
      if (!Number.isFinite(qtde) || qtde <= 0) {
        throw new BadRequestException(
          `comboRules[${index}].qtde deve ser maior que zero.`,
        );
      }

      return { cdgru, qtde };
    });

    const seen = new Set<number>();
    for (const rule of normalized) {
      if (seen.has(rule.cdgru)) {
        throw new BadRequestException('cdgru duplicado em comboRules.');
      }
      seen.add(rule.cdgru);
    }

    return normalized;
  }

  private buildComboData(
    rules: Array<{ cdgru: number; qtde: number }>,
    itemId: string,
  ): Prisma.T_ItensComboCreateManyInput[] {
    return rules.map((rule) => ({
      ID_ITEM: itemId,
      CDGRU: rule.cdgru,
      QTDE: rule.qtde,
    }));
  }

  private async assertTypeC(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    item: Awaited<ReturnType<ProductBaseService['findItemById']>>,
    requireCombo: boolean,
  ) {
    if (item.ComboSN !== 'S') {
      throw new BadRequestException('Item nao marcado como produto combo.');
    }

    if (item.itprodsn === 'S') {
      throw new BadRequestException('Produto combo nao pode ser composto.');
    }

    const itemId = this.ensureItemId(item);
    const { formulaCount, comboCount } = await this.getRelationCounts(
      prisma,
      itemId,
    );

    if (formulaCount > 0) {
      throw new BadRequestException('Produto combo nao pode ter formulas.');
    }

    if (requireCombo && comboCount === 0) {
      throw new BadRequestException('Produto combo sem regras cadastradas.');
    }
  }
}
