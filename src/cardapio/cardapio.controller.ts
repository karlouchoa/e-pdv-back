import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { resolveTenantFromRequest } from '../public/tenant-resolver';

@Controller('cardapio')
export class CardapioController {
  constructor(private readonly tenantDbService: TenantDbService) {}

  @Public() // Libera do JwtAuthGuard
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

    // Obtem o cliente Prisma especifico para este banco
    // Seu TenantDbService ja busca na t_acessos pelo campo 'banco'
    const prisma = await this.tenantDbService.getTenantClient(tenant);

    // 4. Retorna os produtos (ajustado ao seu schema_tenant)
    const where = { ativosn: 'S' };
    const total = await prisma.t_itens.count({ where });
    const items = await prisma.t_itens.findMany({
      where,
      skip,
      take: pageSize,
      select: {
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
            AUTOCOD: 'asc',
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
            autocod: 'asc',
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
        cdgruit: true, // included cdgruit from t_itens
        // adicione os campos que deseja expor no cardápio
      },
    });

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

    const itemsWithImages = items.map((item) => {
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
      const formulas =
        item.itprodsn === 'S' ? (rawFormulas ?? []) : undefined;
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

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: itemsWithImages,
    };
  }
}
