import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import type {
  ProductBaseDto,
  UpdateProductBaseDto,
} from './dto/product-base.dto';

type ItemTypeFlags = {
  itprodsn: string;
  comboSN: string;
};

type ItemSummary = {
  ID: string | null;
  cditem: number;
  cdemp: number;
  itprodsn: string | null;
  ComboSN: string | null;
  undven: string | null;
};

export class ProductBaseService {
  private readonly defaultCompanyId = 1;
  private readonly matrizCompanyCache = new Map<string, number>();

  constructor(protected readonly tenantDbService: TenantDbService) {}

  protected async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  protected async getMatrizCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.matrizCompanyCache.get(tenant);
    if (cached) {
      return cached;
    }

    const matriz = await prisma.t_emp.findFirst({
      where: { matriz: 'S' },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    const cdemp = matriz?.cdemp ?? this.defaultCompanyId;
    this.matrizCompanyCache.set(tenant, cdemp);
    return cdemp;
  }

  protected mapBaseCreateData(
    dto: ProductBaseDto,
    cdemp: number,
    flags: ItemTypeFlags,
  ): Prisma.t_itensUncheckedCreateInput {
    const data: Prisma.t_itensUncheckedCreateInput = {
      cdemp,
      deitem: this.normalizeRequiredString(dto.name, 'name'),
      defat: this.trimString(dto.description),
      undven: this.trimString(dto.unit) ?? 'UN',
      cdgruit: dto.category ?? null,
      mrcitem: this.trimString(dto.brand),
      preco: dto.salePrice ?? 0,
      custo: dto.costPrice ?? 0,
      codncm: this.trimString(dto.ncm),
      cest: this.trimString(dto.cest),
      codcst: this.trimString(dto.cst),
      barcodeit: this.trimString(dto.barcode),
      diasent: dto.leadTimeDays ?? 0,
      qtembitem: dto.qtembitem ?? 0,
      obsitem: this.trimString(dto.notes),
      locfotitem: this.trimString(dto.imagePath),
      ativosn: this.normalizeActive(dto.active),
      negativo: 'S',
      aceitadesc: 'S',
      itprodsn: flags.itprodsn,
      ComboSN: flags.comboSN,
      datacadit: new Date(),
      updatedat: new Date(),
    };

    return data;
  }

  protected mapBaseUpdateData(
    dto: UpdateProductBaseDto,
    flags: ItemTypeFlags,
  ): Prisma.t_itensUncheckedUpdateInput {
    const data: Prisma.t_itensUncheckedUpdateInput = {
      updatedat: new Date(),
      itprodsn: flags.itprodsn,
      ComboSN: flags.comboSN,
    };

    if (dto.name !== undefined) {
      data.deitem = this.normalizeRequiredString(dto.name, 'name');
    }

    if (dto.description !== undefined) {
      data.defat = this.trimString(dto.description);
    }

    if (dto.unit !== undefined) {
      data.undven = this.trimString(dto.unit) ?? 'UN';
    }

    if (dto.category !== undefined) {
      data.cdgruit = dto.category ?? null;
    }

    if (dto.brand !== undefined) {
      data.mrcitem = this.trimString(dto.brand);
    }

    if (dto.salePrice !== undefined) {
      data.preco = dto.salePrice;
    }

    if (dto.costPrice !== undefined) {
      data.custo = dto.costPrice;
    }

    if (dto.leadTimeDays !== undefined) {
      data.diasent = dto.leadTimeDays;
    }

    if (dto.qtembitem !== undefined) {
      data.qtembitem = dto.qtembitem;
    }

    if (dto.ncm !== undefined) {
      data.codncm = this.trimString(dto.ncm);
    }

    if (dto.cest !== undefined) {
      data.cest = this.trimString(dto.cest);
    }

    if (dto.cst !== undefined) {
      data.codcst = this.trimString(dto.cst);
    }

    if (dto.barcode !== undefined) {
      data.barcodeit = this.trimString(dto.barcode);
    }

    if (dto.notes !== undefined) {
      data.obsitem = this.trimString(dto.notes);
    }

    if (dto.imagePath !== undefined) {
      data.locfotitem = this.trimString(dto.imagePath);
    }

    if (dto.active !== undefined) {
      data.ativosn = this.normalizeActive(dto.active);
    }

    return data;
  }

  protected async findItemById(
    prisma: TenantClient,
    cdemp: number,
    id: string,
  ): Promise<ItemSummary> {
    const item = await prisma.t_itens.findFirst({
      where: {
        cdemp,
        ID: id,
      },
      select: {
        ID: true,
        cditem: true,
        cdemp: true,
        itprodsn: true,
        ComboSN: true,
        undven: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item nao encontrado.');
    }

    return item;
  }

  protected ensureItemId(item: ItemSummary): string {
    const id = item.ID?.trim();
    if (!id) {
      throw new BadRequestException('Item sem ID UUID valido.');
    }

    return id;
  }

  protected async getRelationCounts(
    prisma: TenantClient,
    itemId: string,
  ): Promise<{ formulaCount: number; comboCount: number }> {
    // TODO: add product_type column in t_itens to avoid relation checks.
    const [formulaCount, comboCount] = await Promise.all([
      prisma.t_formulas.count({ where: { ID_ITEM: itemId } }),
      prisma.t_ItensCombo.count({ where: { ID_ITEM: itemId } }),
    ]);

    return { formulaCount, comboCount };
  }

  protected trimString(value?: string | null): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return String(value).trim();
  }

  protected normalizeActive(value?: string | null): string {
    const normalized = this.trimString(value ?? 'S')?.toUpperCase();
    return normalized === 'N' ? 'N' : 'S';
  }

  protected normalizeRequiredString(value: string, field: string): string {
    const normalized = this.trimString(value);
    if (!normalized) {
      throw new BadRequestException(`Campo obrigatorio ausente: ${field}.`);
    }

    return normalized;
  }

  protected toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return parsed;
  }
}
