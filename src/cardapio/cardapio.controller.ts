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
import { listCompatibleComboRulesByItemCodes } from '../lib/combo-schema-compat';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { resolvePublicSubdomainFromRequest } from '../public/tenant-resolver';
import { ListarProdutosCardapioQueryDto } from './dto/listar-produtos-cardapio-query.dto';

type CardapioItemRecord = {
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
  }>;
  cdgruit: number | null;
  subgru: number | null;
};

type CardapioItemResponse = Omit<
  CardapioItemRecord,
  't_imgitens' | 't_formulas' | 't_itenscombo'
> & {
  ID: string | null;
  id: string | null;
  ComboSN: string | null;
  saldo: number | null;
  locfotitem: string | null;
  imageUrls: string[];
  categoria: { cdgru: number; degru: string | null } | null;
  t_formulas?: CardapioItemRecord['t_formulas'];
  T_ItensCombo?: Array<{
    ID: string | null;
    id: string | null;
    ID_ITEM: string | null;
    id_item: string | null;
    CDGRU: number;
    cdgru: number;
    QTDE: unknown;
    qtde: unknown;
    ID_SUBGRUPO: string | null;
    id_subgrupo: string | null;
    grupo: { cdgru: number; degru: string | null } | null;
  }>;
  t_itenscombo?: Array<{
    id: string | null;
    id_item: string | null;
    cdgru: number;
    qtde: unknown;
    id_subgrupo: string | null;
    CDGRU?: number;
    QTDE?: unknown;
    ID_SUBGRUPO?: string | null;
    grupo: { cdgru: number; degru: string | null } | null;
  }>;
};

type CardapioCategoryResponse = {
  code: number | null;
  label: string;
};

type CardapioComboRecord = {
  cditem: number;
  deitem: string | null;
  defat: string | null;
  undven: string | null;
  preco: unknown;
  negativo: string | null;
  locfotitem: string | null;
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
    const [acesso, companyRows] = await Promise.all([
      Promise.resolve(accessProfile),
      prisma.$queryRawUnsafe<
        Array<{
          cdemp: number | null;
          deemp: string | null;
          fantemp: string | null;
          endemp: string | null;
          numemp: string | null;
          complemp: string | null;
          baiemp: string | null;
          cidemp: string | null;
          estemp: string | null;
          cepemp: string | null;
          dddemp: string | null;
          fonemp: string | null;
          emailemp: string | null;
          wwwemp: string | null;
          logonfe: string | null;
          path_img_capa: string | null;
          imagem_capa: string | null;
          latitude: unknown;
          longitude: unknown;
          taxa_entrega: unknown;
        }>
      >(
        `SELECT
           cdemp,
           deemp,
           fantemp,
           endemp,
           numemp,
           complemp,
           baiemp,
           cidemp,
           estemp,
           cepemp,
           dddemp,
           fonemp,
           emailemp,
           wwwemp,
           logonfe,
           path_img_capa,
           imagem_capa,
           latitude,
           longitude,
           taxa_entrega
         FROM t_emp
         WHERE matriz = 'S'
         ORDER BY cdemp ASC
         LIMIT 1`,
      ),
    ]);
    const company = companyRows[0] ?? null;

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
      companyId: null,
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
    const categories = categoryIds.length
      ? await prisma.t_gritens.findMany({
          where: { cdgru: { in: categoryIds } },
          select: { cdgru: true, degru: true },
        })
      : [];
    const categoryMap = new Map(
      categories.map((category) => [category.cdgru, category]),
    );

    return items.map((item) => {
      const { t_imgitens: rawImages, t_formulas: rawFormulas, ...rest } = item;
      const imageUrls = (rawImages ?? [])
        .map((image) => (image.url ?? '').trim())
        .filter((url) => url.length > 0);
      if (!imageUrls.length) {
        const fallback = item.locfotitem?.trim();
        if (fallback) {
          imageUrls.push(fallback);
        }
      }

      return {
        ...rest,
        ID: String(item.cditem),
        id: String(item.cditem),
        ComboSN: item.combosn ?? null,
        saldo: saldoByCditem.get(item.cditem) ?? 0,
        locfotitem: imageUrls[0] ?? item.locfotitem ?? null,
        imageUrls,
        categoria:
          typeof item.cdgruit === 'number'
            ? (categoryMap.get(item.cdgruit) ?? null)
            : null,
        t_formulas: item.itprodsn === 'S' ? (rawFormulas ?? []) : undefined,
        T_ItensCombo: item.combosn === 'S' ? [] : undefined,
        t_itenscombo: item.combosn === 'S' ? [] : undefined,
      };
    });
  }

  private async attachFormulas(
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
    items: Array<
      Omit<CardapioItemRecord, 't_formulas' | 't_imgitens'> & {
        t_formulas?: CardapioItemRecord['t_formulas'];
      }
    >,
  ): Promise<CardapioItemRecord[]> {
    const cditems = [
      ...new Set(
        items
          .map((item) => item.cditem)
          .filter((cditem): cditem is number => typeof cditem === 'number'),
      ),
    ];

    const formulaMap = new Map<number, CardapioItemRecord['t_formulas']>();
    if (cditems.length) {
      const formulas = await prisma.$queryRawUnsafe<
        Array<CardapioItemRecord['t_formulas'][number]>
      >(
        `SELECT
           autocod,
           cditem,
           empitem,
           undven,
           matprima,
           qtdemp,
           undmp,
           empitemmp,
           deitem_iv
         FROM t_formulas
         WHERE cditem IN (${cditems.join(',')})
         ORDER BY autocod ASC`,
      );

      for (const formula of formulas) {
        const cditem = formula.cditem;
        if (typeof cditem !== 'number') continue;
        const current = formulaMap.get(cditem) ?? [];
        current.push(formula);
        formulaMap.set(cditem, current);
      }
    }

    return items.map((item) => ({
      ...item,
      t_imgitens: [],
      t_formulas: formulaMap.get(item.cditem) ?? [],
    }));
  }

  private buildItemSelect() {
    return {
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
        },
        orderBy: {
          autocod: 'asc' as const,
        },
      },
      cdgruit: true,
      subgru: true,
    };
  }

  private buildComboSelect() {
    return {
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

    return combos.map((item) => ({
      id: String(item.cditem),
      CDITEM: item.cditem,
      DEITEM: item.deitem,
      defat: item.defat,
      undven: item.undven,
      preco: this.toNumber(item.preco),
      NEGATIVO: item.negativo,
      SALDO: stockByCditem.get(item.cditem) ?? 0,
      url: item.locfotitem,
    }));
  }

  private async attachComboRules(
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
    items: CardapioItemResponse[],
  ): Promise<CardapioItemResponse[]> {
    const comboItems = items.filter(
      (item) => (item.ComboSN ?? '').toString().trim().toUpperCase() === 'S',
    );
    if (!comboItems.length) {
      return items;
    }

    const ruleRows = await listCompatibleComboRulesByItemCodes(
      prisma,
      comboItems.map((item) => item.cditem),
    );
    const rulesByItem = new Map<number, CardapioItemResponse['T_ItensCombo']>();

    for (const row of ruleRows) {
      const current = rulesByItem.get(row.cditem ?? 0) ?? [];
      current.push({
        ID:
          row.autocod !== null
            ? String(row.autocod)
            : `${row.cditem ?? ''}:${row.cdgru}`,
        id:
          row.autocod !== null
            ? String(row.autocod)
            : `${row.cditem ?? ''}:${row.cdgru}`,
        ID_ITEM: String(row.cditem ?? ''),
        id_item: String(row.cditem ?? ''),
        CDGRU: row.cdgru,
        cdgru: row.cdgru,
        QTDE: row.qtde,
        qtde: row.qtde,
        ID_SUBGRUPO: String(row.cdgru),
        id_subgrupo: String(row.cdgru),
        grupo: {
          cdgru: row.cdgru,
          degru: row.subgroupLabel ?? null,
        },
      });
      rulesByItem.set(row.cditem ?? 0, current);
    }

    return items.map((item) =>
      (item.ComboSN ?? '').toString().trim().toUpperCase() === 'S'
        ? {
            ...item,
            T_ItensCombo: rulesByItem.get(item.cditem) ?? [],
            t_itenscombo: rulesByItem.get(item.cditem) ?? [],
          }
        : item,
    );
  }

  @Public()
  @Get('produtos')
  async listarProdutos(
    @Req() req: Request,
    @Query() query: ListarProdutosCardapioQueryDto,
  ) {
    const pageSize = Math.max(1, query.pageSize ?? 24);
    const page = Math.max(1, query.page ?? 1);
    const skip = (page - 1) * pageSize;
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);

    const totalRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total
       FROM t_itens
       WHERE ativosn = 'S'`,
    );
    const total = totalRows[0]?.total ?? 0;
    const rawItems = await prisma.$queryRawUnsafe<
      Array<Omit<CardapioItemRecord, 't_formulas' | 't_imgitens'>>
    >(
      `SELECT
         cditem,
         deitem,
         defat,
         preco,
         locfotitem,
         itprodsn,
         combosn,
         negativo,
         cdgruit,
         subgru
       FROM t_itens
       WHERE ativosn = 'S'
       ORDER BY cditem ASC
       LIMIT ${pageSize}
       OFFSET ${skip}`,
    );

    const items = await this.attachFormulas(prisma, rawItems);
    const itemsWithImages = await this.mapCardapioItems(prisma, items);
    const itemsWithCombos = await this.attachComboRules(prisma, itemsWithImages);
    const categories = this.buildSortedCategories(itemsWithCombos);
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
      items: itemsWithCombos,
    };
  }

  @Public()
  @Get('combos')
  async listarCombos(@Req() req: Request) {
    const tenantSubdomain = resolvePublicSubdomainFromRequest(req);
    const prisma =
      await this.tenantDbService.getTenantClientBySubdomain(tenantSubdomain);

    const combos = await prisma.$queryRawUnsafe<CardapioComboRecord[]>(
      `SELECT
         cditem,
         deitem,
         defat,
         undven,
         preco,
         negativo,
         locfotitem
       FROM t_itens
       WHERE ativosn = 'S'
         AND COALESCE(combosn, 'N') = 'S'
       ORDER BY cditem ASC`,
    );

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
    if (!byCode) {
      throw new NotFoundException('Produto nao encontrado no cardapio.');
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<Omit<CardapioItemRecord, 't_formulas' | 't_imgitens'>>
    >(
      `SELECT
         cditem,
         deitem,
         defat,
         preco,
         locfotitem,
         itprodsn,
         combosn,
         negativo,
         cdgruit,
         subgru
       FROM t_itens
       WHERE ativosn = 'S'
         AND cditem = ${byCode}
       LIMIT 1`,
    );
    const item = rows[0] ?? null;

    if (!item) {
      throw new NotFoundException('Produto nao encontrado no cardapio.');
    }

    const hydrated = await this.attachFormulas(prisma, [item]);
    const mapped = await this.mapCardapioItems(prisma, hydrated);
    const withCombos = await this.attachComboRules(prisma, mapped);
    return withCombos[0];
  }
}
