import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateProductADto } from './dto/create-product-a.dto';
import { UpdateProductADto } from './dto/update-product-a.dto';
import { ProductBaseService } from './product-base.service';

@Injectable()
export class ProductAService extends ProductBaseService {
  constructor(tenantDbService: TenantDbService) {
    super(tenantDbService);
  }

  async create(tenant: string, dto: CreateProductADto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const data = this.mapBaseCreateData(dto, cdemp, {
      itprodsn: 'N',
      comboSN: 'N',
    });

    const item = await prisma.t_itens.create({ data });
    return { item };
  }

  async update(tenant: string, id: string, dto: UpdateProductADto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);
    await this.assertTypeA(prisma, item);

    const data = this.mapBaseUpdateData(dto, {
      itprodsn: 'N',
      comboSN: 'N',
    });

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

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const item = await this.findItemById(prisma, cdemp, id);
    await this.assertTypeA(prisma, item);

    const updated = await prisma.t_itens.update({
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
  }

  private async assertTypeA(
    prisma: Awaited<ReturnType<ProductBaseService['getPrisma']>>,
    item: Awaited<ReturnType<ProductBaseService['findItemById']>>,
  ) {
    if (item.itprodsn === 'S') {
      throw new BadRequestException('Item pertence a produtos compostos.');
    }

    if (item.ComboSN === 'S') {
      throw new BadRequestException('Item pertence a produtos combo.');
    }

    const itemId = this.ensureItemId(item);
    const { formulaCount, comboCount } = await this.getRelationCounts(
      prisma,
      itemId,
    );

    if (formulaCount > 0 || comboCount > 0) {
      throw new BadRequestException(
        'Produto A nao pode possuir formulas ou regras de combo.',
      );
    }
  }
}
