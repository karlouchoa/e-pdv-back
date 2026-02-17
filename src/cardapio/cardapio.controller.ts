import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { resolveTenantFromRequest } from '../public/tenant-resolver';

type CardapioItemRecord = {
  ID: string | null;
  cditem: number;
  deitem: string | null;
  defat: string | null;
  preco: unknown;
  locfotitem: string | null;
  itprodsn: string | null;
  ComboSN: string | null;
  t_imgitens: Array<{ URL: string | null }>;
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
    ID_ITEM: string | null;
  }>;
  T_ItensCombo: Array<{
    ID: string;
    ID_ITEM: string;
    CDGRU: number;
    QTDE: unknown;
  }>;
  cdgruit: number | null;
};

type TenantCompanyProfile = {
  name: string;
  companyCode: number | null;
  companyId: string | null;
  logoUrl: string | null;
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

  private async resolveTenantProfile(
    tenant: string,
    prisma: Awaited<ReturnType<TenantDbService['getTenantClient']>>,
  ): Promise<TenantCompanyProfile> {
    const main = this.tenantDbService.getMainClient();
    const [acesso, company] = await Promise.all([
      main.t_acessos.findFirst({
        where: {
          ativo: 'S',
          banco: tenant,
        },
        select: {
          Empresa: true,
          logoUrl: true,
          imagem_capa: true,
        },
      }),
      prisma.t_emp.findFirst({
        where: { matriz: 'S' },
        select: {
          cdemp: true,
          ID: true,
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
        },
        orderBy: { cdemp: 'asc' },
      }),
    ]);

    const name =
      company?.fantemp?.trim() ||
      company?.deemp?.trim() ||
      acesso?.Empresa?.trim() ||
      tenant;

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
      companyId: this.normalizeText(company?.ID, 64),
      logoUrl: logoFromCompany ?? this.normalizeText(acesso?.logoUrl, 1000),
      coverUrl:
        coverFromCompany ?? this.normalizeText(acesso?.imagem_capa, 255),
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
  ) {
    const categoryIds = [
      ...new Set(
        items
          .map((item) => item.cdgruit)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const comboGroupIds = [
      ...new Set(
        items
          .filter((item) => item.ComboSN === 'S')
          .flatMap((item) => item.T_ItensCombo ?? [])
          .map((combo) => combo.CDGRU)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const groupIds = [...new Set([...categoryIds, ...comboGroupIds])];

    const groups = groupIds.length
      ? await prisma.t_gritens.findMany({
          where: { cdgru: { in: groupIds } },
          select: { cdgru: true, degru: true },
        })
      : [];
    const groupMap = new Map(groups.map((group) => [group.cdgru, group]));

    return items.map((item) => {
      const {
        t_imgitens: rawImages,
        t_formulas: rawFormulas,
        T_ItensCombo: rawCombos,
        ...rest
      } = item;

      const imageUrls = (rawImages ?? [])
        .map((image) => (image.URL ?? '').trim())
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
          ? (groupMap.get(item.cdgruit) ?? null)
          : null;
      const formulas = item.itprodsn === 'S' ? (rawFormulas ?? []) : undefined;
      const combos =
        item.ComboSN === 'S'
          ? (rawCombos ?? []).map((combo) => ({
              ...combo,
              grupo:
                typeof combo.CDGRU === 'number'
                  ? (groupMap.get(combo.CDGRU) ?? null)
                  : null,
            }))
          : undefined;

      return {
        ...rest,
        locfotitem: primaryImage,
        imageUrls,
        categoria,
        t_formulas: formulas,
        T_ItensCombo: combos,
      };
    });
  }

  private buildItemSelect() {
    return {
      ID: true,
      cditem: true,
      deitem: true,
      defat: true,
      preco: true,
      locfotitem: true,
      itprodsn: true,
      ComboSN: true,
      t_imgitens: {
        select: {
          URL: true,
        },
        orderBy: {
          AUTOCOD: 'asc' as const,
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
          ID_ITEM: true,
        },
        orderBy: {
          autocod: 'asc' as const,
        },
      },
      T_ItensCombo: {
        select: {
          ID: true,
          ID_ITEM: true,
          CDGRU: true,
          QTDE: true,
        },
      },
      cdgruit: true,
    };
  }

  @Public()
  @Get('produtos')
  async listarProdutos(@Req() req: Request) {
    const pageSize = 50;
    const pageParam = Array.isArray(req.query.page)
      ? req.query.page[0]
      : req.query.page;
    const parsedPage = Number(pageParam);
    const page =
      Number.isFinite(parsedPage) && parsedPage > 0
        ? Math.floor(parsedPage)
        : 1;
    const skip = (page - 1) * pageSize;
    const tenant = resolveTenantFromRequest(req);

    const prisma = await this.tenantDbService.getTenantClient(tenant);

    const where = { ativosn: 'S' };
    const total = await prisma.t_itens.count({ where });
    const items = (await prisma.t_itens.findMany({
      where,
      skip,
      take: pageSize,
      select: this.buildItemSelect(),
    })) as CardapioItemRecord[];

    const itemsWithImages = await this.mapCardapioItems(prisma, items);
    const tenantProfile = await this.resolveTenantProfile(tenant, prisma);

    return {
      tenant: tenantProfile,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: itemsWithImages,
    };
  }

  @Public()
  @Get('empresa')
  async obterEmpresa(@Req() req: Request) {
    const tenant = resolveTenantFromRequest(req);
    const prisma = await this.tenantDbService.getTenantClient(tenant);
    return this.resolveTenantProfile(tenant, prisma);
  }

  @Public()
  @Get('produtos/:id')
  async obterProduto(@Req() req: Request, @Param('id') id: string) {
    const tenant = resolveTenantFromRequest(req);
    const prisma = await this.tenantDbService.getTenantClient(tenant);

    const trimmed = id.trim();
    const cditem = Number(trimmed);
    const byCode = Number.isInteger(cditem) && cditem > 0 ? cditem : null;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const orFilters: Array<{ ID: string } | { cditem: number }> = [];
    if (isUuid) {
      orFilters.push({ ID: trimmed });
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
