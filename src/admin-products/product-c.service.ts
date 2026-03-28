import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateProductCDto } from './dto/create-product-c.dto';
import { UpdateProductCDto } from './dto/update-product-c.dto';
import { ProductBaseService } from './product-base.service';

@Injectable()
export class ProductCService extends ProductBaseService {
  constructor(tenantDbService: TenantDbService) {
    super(tenantDbService);
  }

  private ensureComboRulesSupported() {
    throw new BadRequestException(
      'O schema atual de t_itenscombo nao possui coluna para vincular a regra ao item combo. Adicione id_item ou cditem na tabela para cadastrar comboRules.',
    );
  }

  async create(tenant: string, dto: CreateProductCDto) {
    if (!Array.isArray(dto.comboRules) || dto.comboRules.length === 0) {
      throw new BadRequestException('comboRules nao pode ser vazio.');
    }

    this.ensureComboRulesSupported();

    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const cditem = await this.getNextCditem(prisma, cdemp);

    const data = this.mapBaseCreateData(dto, cdemp, cditem, {
      itprodsn: 'N',
      comboSN: 'S',
    });

    const item = await prisma.t_itens.create({ data });
    return { item, comboRules: [] };
  }

  async update(tenant: string, id: string, dto: UpdateProductCDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const item = await this.findItemById(prisma, cdemp, id);

    const hasComboInput = Array.isArray(dto.comboRules);
    await this.assertTypeC(prisma, item);

    if (hasComboInput) {
      if (!dto.comboRules?.length) {
        throw new BadRequestException('comboRules nao pode ser vazio.');
      }
      this.ensureComboRulesSupported();
    }

    const data = this.mapBaseUpdateData(dto, {
      itprodsn: 'N',
      comboSN: 'S',
    });

    const updated = await prisma.t_itens.update({
      where: { cditem: item.cditem },
      data,
    });

    return { item: updated };
  }

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const item = await this.findItemById(prisma, cdemp, id);

    await this.assertTypeC(prisma, item);

    const updated = await prisma.t_itens.update({
      where: { cditem: item.cditem },
      data: {
        isdeleted: true,
        ativosn: 'N',
        ativoprod: 'N',
        updatedat: new Date(),
      },
    });

    return { item: updated };
  }

  private async assertTypeC(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    item: Awaited<ReturnType<ProductBaseService['findItemById']>>,
  ) {
    if (item.combosn !== 'S') {
      throw new BadRequestException('Item nao marcado como produto combo.');
    }

    if (item.itprodsn === 'S') {
      throw new BadRequestException('Produto combo nao pode ser composto.');
    }

    const { formulaCount } = await this.getRelationCounts(prisma, item);
    if (formulaCount > 0) {
      throw new BadRequestException('Produto combo nao pode ter formulas.');
    }
  }
}
