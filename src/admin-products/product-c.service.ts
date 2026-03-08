import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { ComboRuleDto } from './dto/combo-rule.dto';
import { CreateProductCDto } from './dto/create-product-c.dto';
import { UpdateProductCDto } from './dto/update-product-c.dto';
import { ProductBaseService } from './product-base.service';

@Injectable()
export class ProductCService extends ProductBaseService {
  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const resolved = await this.resolveComboSubgroupLinks(tx, normalized);
      const comboData = this.buildComboData(resolved, itemId);

      await tx.t_itenscombo.createMany({ data: comboData });

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
      await tx.t_itenscombo.deleteMany({ where: { id_item: itemId } });

      const resolved = await this.resolveComboSubgroupLinks(tx, normalized);
      const comboData = this.buildComboData(resolved, itemId);
      await tx.t_itenscombo.createMany({ data: comboData });

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
      await tx.t_itenscombo.deleteMany({ where: { id_item: itemId } });

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

      const idSubgrupo = this.normalizeOptionalUuid(rule.id_subgrupo);

      return { cdgru, qtde, id_subgrupo: idSubgrupo };
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

  private normalizeOptionalUuid(value?: string | null) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    if (!this.uuidRegex.test(trimmed)) {
      throw new BadRequestException('id_subgrupo invalido em comboRules.');
    }

    return trimmed;
  }

  private async resolveComboSubgroupLinks(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>> | Prisma.TransactionClient,
    rules: Array<{ cdgru: number; qtde: number; id_subgrupo: string | null }>,
  ) {
    return Promise.all(
      rules.map(async (rule, index) => {
        const requestedId = rule.id_subgrupo;

        if (requestedId) {
          const subgroup = await prisma.t_subgr.findFirst({
            where: { id: requestedId },
            select: { cdsub: true, id: true },
          });

          if (!subgroup) {
            throw new BadRequestException(
              `comboRules[${index}].id_subgrupo nao encontrado em t_subgr.`,
            );
          }

          if (subgroup.cdsub !== rule.cdgru) {
            throw new BadRequestException(
              `comboRules[${index}] possui cdgru diferente do id_subgrupo informado.`,
            );
          }

          return {
            cdgru: subgroup.cdsub,
            qtde: rule.qtde,
            id_subgrupo: subgroup.id,
          };
        }

        const subgroup = await prisma.t_subgr.findUnique({
          where: { cdsub: rule.cdgru },
          select: { cdsub: true, id: true },
        });

        if (!subgroup) {
          throw new BadRequestException(
            `comboRules[${index}].cdgru nao encontrado em t_subgr.`,
          );
        }

        if (!subgroup.id?.trim()) {
          throw new BadRequestException(
            `Subgrupo ${subgroup.cdsub} sem ID para vinculo em t_itenscombo.ID_SUBGRUPO.`,
          );
        }

        return {
          cdgru: subgroup.cdsub,
          qtde: rule.qtde,
          id_subgrupo: subgroup.id,
        };
      }),
    );
  }

  private buildComboData(
    rules: Array<{ cdgru: number; qtde: number; id_subgrupo: string }>,
    itemId: string,
  ): Prisma.t_itenscomboCreateManyInput[] {
    return rules.map((rule) => ({
      id_item: itemId,
      cdgru: rule.cdgru,
      qtde: rule.qtde,
      id_subgrupo: rule.id_subgrupo,
    }));
  }

  private async assertTypeC(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    item: Awaited<ReturnType<ProductBaseService['findItemById']>>,
    requireCombo: boolean,
  ) {
    if (item.combosn !== 'S') {
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
