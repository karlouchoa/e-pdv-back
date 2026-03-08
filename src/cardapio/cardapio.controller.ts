import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { resolvePublicSubdomainFromRequest } from '../public/tenant-resolver';
import { ListarProdutosCardapioQueryDto } from './dto/listar-produtos-cardapio-query.dto';

type CardapioItemRecord = {
  id: string | null;
  cditem: number;
  deitem: string | null;
  defat: string | null;
  preco: unknown;
  locfotitem: string | null;
  itprodsn: string | null;
  combosn: string | null;
  negativo: string | null;
  t_imgitens: Array<{ url: string | null }>;
  t_formulas: Array<{
    autocod: number;
    cditem: number | null;
    empitem: number | null;
    undven: string | null;
    matprima: number;
    qtdemp: unknown;
    undmp: string | null;
    empitemmp: number | null;
    deitem_iv: string | null;
    id_item: string | null;
  }>;
  t_itenscombo: Array<{
    id: string;
    id_item: string;
    cdgru: number;
    qtde: unknown;
    id_subgrupo: string | null;
    CDGRU?: number;
    QTDE?: unknown;
    ID_SUBGRUPO?: string | null;
  }>;
  cdgruit: number | null;
  subgru: number | null;
};

type CardapioItemResponse = Omit<
  CardapioItemRecord,
  't_imgitens' | 't_formulas' | 't_itenscombo'
> & {
  saldo: number | null;
  locfotitem: string | null;
  imageUrls: string[];
  categoria: { cdgru: number; degru: string | null } | null;
  t_formulas?: CardapioItemRecord['t_formulas'];
  t_itenscombo?: Array<
    CardapioItemRecord['t_itenscombo'][number] & {
      grupo: { cdgru: number; degru: string | null } | null;
    }
  >;
};

type CardapioCategoryResponse = {
  code: number | null;
  label: string;
};

type CardapioComboRecord = {
  id: string | null;
  cditem: number;
  deitem: string | null;
  defat: string | null;
  undven: string | null;
  preco: unknown;
  negativo: string | null;
  t_imgitens: Array<{ url: string | null }>;
};

type CardapioComboResponse = {
  id: string | null;
  CDITEM: number;
  DEITEM: string | null;
  defat: string | null;
  undven: string | null;
  preco: number | null;
  NEGATIVO: string | null;
  SALDO: number | null;
  url: string | null;
};

type TenantCompanyProfile = {
  name: string;
  companyCode: number | null;
  companyId: string | null;
  taxaEntrega: number | null;
  logourl: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  addressLine: string | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
};

@Controller('cardapio')
export class CardapioController {
  constructor(private readonly tenantDbService: TenantDbService) {}
  private readonly categoryCollator = new Intl.Collator('pt-BR', {
    sensitivity: 'base',
    numeric: true,
  });

  private stringifyScalar(value: unknown): string {
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    return '';
  }

  private normalizeText(value: unknown, maxLen = 255): string | null {
    if (value === null || value === undefined) return null;
    const text = this.stringifyScalar(value).trim();
    if (!text) return null;
    return text.slice(0, maxLen);
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeUuid(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
      ? normalized.toLowerCase()
      : null;
  }

  private joinNonEmpty(
    parts: Array<string | null | undefined>,
    separator: string,
  ) {
    return parts
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(separator);
  }

  private normalizePhone(ddd?: string | null, phone?: string | null) {
    const dddValue = this.normalizeText(ddd, 5);
    const phoneValue = this.normalizeText(phone, 20);
    if (dddValue && phoneValue) {
      return `(${dddValue}) ${phoneValue}`;
    }
    return phoneValue ?? null;
  }

  private normalizeCategoryLabel(value: unknown) {
    const text = this.normalizeText(value, 80);
    return text ?? 'Outros';
  }

  private categorySortKey(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private resolveCategoryLabel(item: {
    categoria?: { degru: string | null } | null;
  }) {
    return this.normalizeCategoryLabel(item.categoria?.degru);
  }

  private buildSortedCategories(
    items: CardapioItemResponse[],
  ): CardapioCategoryResponse[] {
    const uniqueByKey = new Map<string, CardapioCategoryResponse>();

    for (const item of items) {
      const label = this.resolveCategoryLabel(item);
      const code =
        typeof item.cdgruit === 'number' && Number.isFinite(item.cdgruit)
          ? item.cdgruit
          : null;
      const key =
        code === null ? `label:${this.categorySortKey(label)}` : `code:${code}`;
      if (uniqueByKey.has(key)) continue;
      uniqueByKey.set(key, { code, label });
    }

    return Array.from(uniqueByKey.values()).sort((a, b) => {
      const byLabel = this.categoryCollator.compare(a.label, b.label);
      if (byLabel !== 0) return byLabel;
      const aCode = a.code ?? Number.MAX_SAFE_INTEGER;
      const bCode = b.code ?? Number.MAX_SAFE_INTEGER;
      return aCode - bCode;
    });
  }

  private async resolveTenantProfile(
    subdomain: string,
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
  ): Promise<TenantCompanyProfile> {
    const accessProfile =
      await this.tenantDbService.getAccessProfileBySubdomain(subdomain);
    const [acesso, company] = await Promise.all([
      Promise.resolve(accessProfile),
      prisma.t_emp.findFirst({
        where: { matriz: 'S' },
        select: {
          cdemp: true,
          id: true,
          deemp: true,
          fantemp: true,
          endemp: true,
          numemp: true,
          complemp: true,
          baiemp: true,
          cidemp: true,
          estemp: true,
          cepemp: true,
          dddemp: true,
          fonemp: true,
          emailemp: true,
          wwwemp: true,
          logonfe: true,
          path_img_capa: true,
          imagem_capa: true,
          latitude: true,
          longitude: true,
          taxa_entrega: true,
        },
        orderBy: { cdemp: 'asc' },
      }),
    ]);

    const name =
      company?.fantemp?.trim() ||
      company?.deemp?.trim() ||
      acesso?.companyName?.trim() ||
      subdomain;

    const street = this.normalizeText(company?.endemp, 80);
    const number = this.normalizeText(company?.numemp, 20);
    const complement = this.normalizeText(company?.complemp, 80);
    const district = this.normalizeText(company?.baiemp, 50);
    const city = this.normalizeText(company?.cidemp, 50);
    const state = this.normalizeText(company?.estemp, 4);
    const zipCode = this.normalizeText(company?.cepemp, 12);

    const line1 = this.joinNonEmpty([street, number], ', ');
    const line2 = this.joinNonEmpty([district, city], ' - ');
    const line3 = this.joinNonEmpty([state, zipCode], ' - ');
    const addressLine = this.joinNonEmpty([line1, line2, line3], ' | ');

    const phone = this.normalizePhone(company?.dddemp, company?.fonemp);
    const logoFromCompany = this.normalizeText(company?.logonfe, 1000);
    const coverFromCompany =
      this.normalizeText(company?.imagem_capa, 255) ??
      this.normalizeText(company?.path_img_capa, 255);

    return {
      name,
      companyCode:
        typeof company?.cdemp === 'number' && Number.isFinite(company.cdemp)
          ? company.cdemp
          : null,
      companyId: this.normalizeText(company?.id, 64),
      taxaEntrega: this.toNumber(company?.taxa_entrega),
      logourl: logoFromCompany ?? this.normalizeText(acesso?.logoUrl, 1000),
      coverUrl: coverFromCompany ?? this.normalizeText(acesso?.coverUrl, 255),
      phone,
      whatsapp: phone,
      email: this.normalizeText(company?.emailemp, 120),
      website: this.normalizeText(company?.wwwemp, 120),
      addressLine: addressLine || null,
      address: {
        street,
        number,
        complement,
        district,
        city,
        state,
        zipCode,
      },
      coordinates: {
        latitude: this.toNumber(company?.latitude),
        longitude: this.toNumber(company?.longitude),
      },
    };
  }

  private async mapCardapioItems(
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
    items: CardapioItemRecord[],
  ): Promise<CardapioItemResponse[]> {
    const itemCditems = [
      ...new Set(
        items
          .map((item) => item.cditem)
          .filter((cditem): cditem is number => typeof cditem === 'number'),
      ),
    ];
    const balances = itemCditems.length
      ? await prisma.t_saldoit.groupBy({
          by: ['cditem'],
          where: { cditem: { in: itemCditems } },
          _sum: { saldo: true },
        })
      : [];
    const saldoByCditem = new Map<number, number>();
    for (const entry of balances) {
      saldoByCditem.set(entry.cditem, this.toNumber(entry._sum.saldo) ?? 0);
    }

    const categoryIds = [
      ...new Set(
        items
          .map((item) => item.cdgruit)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const comboSubgroupCodes = [
      ...new Set(
        items
          .filter((item) => item.combosn === 'S')
          .flatMap((item) => item.t_itenscombo ?? [])
          .map((combo) => combo.cdgru)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const comboSubgroupUuids = [
      ...new Set(
        items
          .filter((item) => item.combosn === 'S')
          .flatMap((item) => item.t_itenscombo ?? [])
          .map((combo) => this.normalizeUuid(combo.id_subgrupo))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const subgroupIds = [
      ...new Set(
        [
          ...items
            .map((item) => item.subgru)
            .filter((id): id is number => typeof id === 'number'),
          ...comboSubgroupCodes,
        ].filter((id) => Number.isFinite(id)),
      ),
    ];

    const categories = categoryIds.length
      ? await prisma.t_gritens.findMany({
          where: { cdgru: { in: categoryIds } },
          select: { cdgru: true, degru: true },
        })
      : [];
    const categoryMap = new Map(
      categories.map((category) => [category.cdgru, category]),
    );

    const subgroups =
      subgroupIds.length || comboSubgroupUuids.length
      ? await prisma.t_subgr.findMany({
          where: {
            OR: [
              ...(subgroupIds.length ? [{ cdsub: { in: subgroupIds } }] : []),
              ...(comboSubgroupUuids.length ? [{ id: { in: comboSubgroupUuids } }] : []),
            ],
          },
          select: { cdsub: true, desub: true, id: true },
        })
      : [];
    const subgroupMapByCode = new Map(
      subgroups.map((subgroup) => [subgroup.cdsub, subgroup]),
    );
    const subgroupMapById = new Map(
      subgroups
        .filter((subgroup) => Boolean(subgroup.id))
        .map((subgroup) => [String(subgroup.id).toLowerCase(), subgroup]),
    );

    return items.map((item) => {
      const {
        t_imgitens: rawImages,
        t_formulas: rawFormulas,
        t_itenscombo: rawCombos,
        ...rest
      } = item;

      const imageUrls = (rawImages ?? [])
        .map((image) => (image.url ?? '').trim())
        .filter((url) => url.length > 0);
      if (!imageUrls.length) {
        const fallback = item.locfotitem?.trim();
        if (fallback) {
          imageUrls.push(fallback);
        }
      }
      const primaryImage = imageUrls[0] ?? item.locfotitem ?? null;
      const categoria =
        typeof item.cdgruit === 'number'
          ? (categoryMap.get(item.cdgruit) ?? null)
          : null;
      const formulas = item.itprodsn === 'S' ? (rawFormulas ?? []) : undefined;
      const combos =
        item.combosn === 'S'
          ? (rawCombos ?? []).map((combo) => ({
              ...((): CardapioItemRecord['t_itenscombo'][number] & {
                grupo: { cdgru: number; degru: string | null } | null;
              } => {
                const subgroupId = this.normalizeUuid(combo.id_subgrupo);
                const subgroup =
                  (subgroupId ? subgroupMapById.get(subgroupId) : null) ??
                  (typeof combo.cdgru === 'number'
                    ? subgroupMapByCode.get(combo.cdgru)
                    : null);

                const resolvedCdgru =
                  typeof subgroup?.cdsub === 'number'
                    ? subgroup.cdsub
                    : combo.cdgru;
                const resolvedSubgroupId =
                  subgroup?.id ?? combo.id_subgrupo ?? null;

                return {
                  ...combo,
                  cdgru: resolvedCdgru,
                  id_subgrupo: resolvedSubgroupId,
                  CDGRU: resolvedCdgru,
                  QTDE: combo.qtde,
                  ID_SUBGRUPO: resolvedSubgroupId,
                  grupo: subgroup
                    ? { cdgru: subgroup.cdsub, degru: subgroup.desub }
                    : null,
                };
              })(),
            }))
          : undefined;

      return {
        ...rest,
        saldo: saldoByCditem.get(item.cditem) ?? 0,
        locfotitem: primaryImage,
        imageUrls,
        categoria,
        t_formulas: formulas,
        t_itenscombo: combos,
      };
    });
  }

  private buildItemSelect() {
    return {
      id: true,
      cditem: true,
      deitem: true,
      defat: true,
      preco: true,
      locfotitem: true,
      itprodsn: true,
      combosn: true,
      negativo: true,
      t_imgitens: {
        select: {
          url: true,
        },
        orderBy: {
          autocod: 'asc' as const,
        },
      },
      t_formulas: {
        select: {
          autocod: true,
          cditem: true,
          empitem: true,
          undven: true,
          matprima: true,
          qtdemp: true,
          undmp: true,
          empitemmp: true,
          deitem_iv: true,
          id_item: true,
        },
        orderBy: {
          autocod: 'asc' as const,
        },
      },
      t_itenscombo: {
        select: {
          id: true,
          id_item: true,
          cdgru: true,
          qtde: true,
          id_subgrupo: true,
        },
      },
      cdgruit: true,
      subgru: true,
    };
  }

  private async mapComboRows(
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
    combos: CardapioComboRecord[],
  ): Promise<CardapioComboResponse[]> {
    if (!combos.length) {
      return [];
    }

    const comboCditems = Array.from(new Set(combos.map((item) => item.cditem)));
    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where: { cditem: { in: comboCditems } },
      _sum: { saldo: true },
    });

    const stockByCditem = new Map<number, number>();
    for (const entry of balances) {
      stockByCditem.set(entry.cditem, this.toNumber(entry._sum.saldo) ?? 0);
    }

    return combos.flatMap((item) =>
      (item.t_imgitens ?? []).map((image) => ({
        id: item.id,
        CDITEM: item.cditem,
        DEITEM: item.deitem,
        defat: item.defat,
        undven: item.undven,
        preco: this.toNumber(item.preco),
        NEGATIVO: item.negativo,
        SALDO: stockByCditem.get(item.cditem) ?? 0,
        url: image.url,
      })),
    );
  }

  @Public()
  @Get('produtos')
  async listarProdutos(
    @Req() req: Request,
    @Query() query: ListarProdutosCardapioQueryDto,
  ) {
    const pageSize = query.pageSize ?? 24;
    const page = query.page ?? 1;
    const skip = (page - 1) * pageSize;
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);

    const where = { ativosn: 'S' };
    const total = await prisma.t_itens.count({ where });
    const items = (await prisma.t_itens.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ cditem: 'asc' }],
      select: this.buildItemSelect(),
    })) as CardapioItemRecord[];

    const itemsWithImages = await this.mapCardapioItems(prisma, items);
    const categories = this.buildSortedCategories(itemsWithImages);
    const tenantProfile = await this.resolveTenantProfile(
      tenantSubdomain,
      prisma,
    );
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1 && totalPages > 0;

    return {
      tenant: tenantProfile,
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      categories,
      items: itemsWithImages,
    };
  }

  @Public()
  @Get('combos')
  async listarCombos(@Req() req: Request) {
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);

    const combos = (await prisma.t_itens.findMany({
      where: {
        ativosn: 'S',
        combosn: 'S',
        t_itenscombo: { some: {} },
        t_imgitens: { some: {} },
      },
      orderBy: [{ cditem: 'asc' }],
      select: {
        id: true,
        cditem: true,
        deitem: true,
        defat: true,
        undven: true,
        preco: true,
        negativo: true,
        t_imgitens: {
          select: {
            url: true,
          },
          orderBy: {
            autocod: 'asc' as const,
          },
        },
      },
    })) as CardapioComboRecord[];

    return this.mapComboRows(prisma, combos);
  }

  @Public()
  @Get('empresa')
  async obterEmpresa(@Req() req: Request) {
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);
    return this.resolveTenantProfile(tenantSubdomain, prisma);
  }

  @Public()
  @Get('produtos/:id')
  async obterProduto(@Req() req: Request, @Param('id') id: string) {
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);

    const trimmed = id.trim();
    const cditem = Number(trimmed);
    const byCode = Number.isInteger(cditem) && cditem > 0 ? cditem : null;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const orFilters: Array<{ id: string } | { cditem: number }> = [];
    if (isUuid) {
      orFilters.push({ id: trimmed });
    }
    if (byCode) {
      orFilters.push({ cditem: byCode });
    }

    if (!orFilters.length) {
      throw new NotFoundException('Produto nao encontrado no cardapio.');
    }

    const item = (await prisma.t_itens.findFirst({
      where: {
        ativosn: 'S',
        OR: orFilters,
      },
      select: this.buildItemSelect(),
    })) as CardapioItemRecord | null;

    if (!item) {
      throw new NotFoundException('Produto nao encontrado no cardapio.');
    }

    const mapped = await this.mapCardapioItems(prisma, [item]);
    return mapped[0];
  }
}
