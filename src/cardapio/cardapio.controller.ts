import { Controller, Get, Req, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantDbService } from '../tenant-db/tenant-db.service';

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
      Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
    const skip = (page - 1) * pageSize;

    // 1. Captura o host (ex: loja_a.goldpdv.com.br)
    const host = req.headers.host;

    const hostWithoutPort = host?.split(':')[0];
    
    // 2. Extrai o subdomínio (loja_a)
    const subdomain = host?.split(':')[0].split('.')[0];

    if (!subdomain || subdomain === 'www') {
      throw new NotFoundException('Estabelecimento não identificado.');
    }

    // 3. Obtém o cliente Prisma específico para este banco
    // Seu TenantDbService já busca na t_acessos pelo campo 'banco'
    const prisma = await this.tenantDbService.getTenantClient(subdomain);

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
        cdgruit: true, // included cdgruit from t_itens
        categoria: {   // include the related categoria (t_gritens)
          select: {
            degru: true, // select degru from t_gritens
          },
        },  
        // adicione os campos que deseja expor no cardápio
      },
    });

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    };
  }
}
