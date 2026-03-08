import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicItemPorCategoriaDto } from './dto/public-item-por-categoria.dto';
import { PublicItensComboItemDto } from './dto/public-itenscombo-item.dto';

@Injectable()
export class PublicCatalogService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClientBySubdomain(tenant);
  }

  private isUuid(value: string): boolean {
    return this.uuidRegex.test(value.trim());
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed =
      typeof value === 'object' &&
      value !== null &&
      'toNumber' in value &&
      typeof (value as { toNumber: () => number }).toNumber === 'function'
        ? (value as { toNumber: () => number }).toNumber()
        : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeUrl(url: string | null | undefined): string | null {
    const normalized = (url ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeUuid(value: string | null | undefined): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }

    return this.isUuid(normalized) ? normalized.toLowerCase() : null;
  }

  private async resolveItemId(
    prisma: TenantClient,
    idItemOrCditem: string,
  ): Promise<string | null> {
    const normalized = String(idItemOrCditem ?? '').trim();
    if (!normalized) {
      return null;
    }

    if (this.isUuid(normalized)) {
      return normalized;
    }

    const cditem = Number(normalized);
    if (!Number.isInteger(cditem) || cditem <= 0) {
      return null;
    }

    const item = await prisma.t_itens.findFirst({
      where: { cditem },
      orderBy: { cdemp: 'asc' },
      select: { id: true },
    });

    return item?.id?.trim() || null;
  }

  private async fetchSaldoByCditem(
    prisma: TenantClient,
    cditems: number[],
  ): Promise<Map<number, number>> {
    const uniqueCditems = Array.from(new Set(cditems)).filter((cditem) =>
      Number.isFinite(cditem),
    );
    if (!uniqueCditems.length) {
      return new Map<number, number>();
    }

    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where: { cditem: { in: uniqueCditems } },
      _sum: { saldo: true },
    });

    const saldoByCditem = new Map<number, number>();
    for (const entry of balances) {
      saldoByCditem.set(entry.cditem, this.toNumber(entry._sum.saldo) ?? 0);
    }

    return saldoByCditem;
  }

  private async resolveSubgroupReference(
    prisma: TenantClient,
    subgroupIdentifier: string,
  ): Promise<{ cdsub: number; id: string | null }> {
    const normalized = String(subgroupIdentifier ?? '').trim();
    if (!normalized) {
      throw new BadRequestException(
        'Subgrupo invalido. Informe o codigo ou ID do subgrupo.',
      );
    }

    if (this.isUuid(normalized)) {
      const subgroupById = await prisma.t_subgr.findFirst({
        where: { id: normalized },
        select: { cdsub: true, id: true },
      });

      if (!subgroupById) {
        throw new BadRequestException('Subgrupo nao encontrado para o ID informado.');
      }

      return { cdsub: subgroupById.cdsub, id: subgroupById.id ?? null };
    }

    const cdsub = Number(normalized);
    if (!Number.isInteger(cdsub) || cdsub <= 0) {
      throw new BadRequestException(
        'Subgrupo invalido. Informe um codigo numerico maior que zero ou um UUID.',
      );
    }

    const subgroupByCode = await prisma.t_subgr.findUnique({
      where: { cdsub },
      select: { cdsub: true, id: true },
    });

    if (!subgroupByCode) {
      throw new BadRequestException(`Subgrupo ${cdsub} nao encontrado.`);
    }

    return { cdsub: subgroupByCode.cdsub, id: subgroupByCode.id ?? null };
  }

  async listItensComboByItem(tenant: string, idItem: string) {
    const prisma = await this.getPrisma(tenant);
    const resolvedItemId = await this.resolveItemId(prisma, idItem);
    if (!resolvedItemId) {
      return [];
    }

    const [records, item] = await Promise.all([
      prisma.t_itenscombo.findMany({
        where: { id_item: resolvedItemId },
        orderBy: { autocod: 'asc' },
      }),
      prisma.t_itens.findFirst({
        where: { id: resolvedItemId },
        select: { cditem: true, negativo: true },
      }),
    ]);

    const saldoByCditem = await this.fetchSaldoByCditem(
      prisma,
      item?.cditem ? [item.cditem] : [],
    );

    const subgroupCodes = Array.from(
      new Set(
        records
          .map((record) => this.toNumber(record.cdgru))
          .filter(
            (value): value is number =>
              typeof value === 'number' &&
              Number.isInteger(value) &&
              value > 0,
          ),
      ),
    );
    const subgroupIds = Array.from(
      new Set(
        records
          .map((record) => this.normalizeUuid(record.id_subgrupo))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const subgroupRows =
      subgroupCodes.length || subgroupIds.length
      ? await prisma.t_subgr.findMany({
          where: {
            OR: [
              ...(subgroupCodes.length ? [{ cdsub: { in: subgroupCodes } }] : []),
              ...(subgroupIds.length ? [{ id: { in: subgroupIds } }] : []),
            ],
          },
          select: { cdsub: true, id: true, desub: true },
        })
      : [];
    const subgroupByCode = new Map(
      subgroupRows.map((row) => [row.cdsub, row]),
    );
    const subgroupById = new Map(
      subgroupRows
        .filter((row) => Boolean(row.id))
        .map((row) => [String(row.id).toLowerCase(), row]),
    );

    const mapped = records.map((record) => {
      const subgroupId = this.normalizeUuid(record.id_subgrupo);
      const subgroupByIdMatch = subgroupId ? subgroupById.get(subgroupId) : null;
      const subgroupByCodeMatch =
        subgroupByIdMatch ??
        (typeof record.cdgru === 'number' ? subgroupByCode.get(record.cdgru) : null);

      const resolvedCdgru = subgroupByCodeMatch?.cdsub ?? record.cdgru;
      const resolvedIdSubgrupo =
        subgroupByCodeMatch?.id ?? record.id_subgrupo ?? null;

      return {
        AUTOCOD: record.autocod,
        ID: record.id,
        ID_ITEM: record.id_item,
        CDGRU:
          typeof resolvedCdgru === 'number' && Number.isFinite(resolvedCdgru)
            ? resolvedCdgru
            : 0,
        QTDE: this.toNumber(record.qtde) ?? 0,
        ID_SUBGRUPO: resolvedIdSubgrupo,
        DEGRU: subgroupByCodeMatch?.desub ?? null,
        NEGATIVO: item?.negativo ?? null,
        SALDO: item?.cditem ? (saldoByCditem.get(item.cditem) ?? 0) : null,
        CREATEDAT: record.createdat,
        UPDATEDAT: record.updatedat,
      };
    });

    return plainToInstance(PublicItensComboItemDto, mapped, {
      excludeExtraneousValues: true,
    });
  }

  async listItensPorCategoria(tenant: string, subgroupIdentifier: string) {
    const prisma = await this.getPrisma(tenant);
    const subgroup = await this.resolveSubgroupReference(
      prisma,
      subgroupIdentifier,
    );
    const records = await prisma.t_itens.findMany({
      where: {
        ativosn: 'S',
        subgru: subgroup.cdsub,
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
        cdgruit: true,
        subgru: true,
        locfotitem: true,
        t_imgitens: {
          select: { url: true },
          orderBy: { autocod: 'asc' },
        },
      },
    });

    const saldoByCditem = await this.fetchSaldoByCditem(
      prisma,
      records.map((record) => record.cditem),
    );

    const mapped = records.map((record) => {
      const imageUrl =
        record.t_imgitens
          .map((image) => this.normalizeUrl(image.url))
          .find((image): image is string => Boolean(image)) ??
        this.normalizeUrl(record.locfotitem);

      return {
        ID: record.id,
        CDITEM: record.cditem,
        DEITEM: record.deitem,
        DEFAT: record.defat,
        UNDVEN: record.undven,
        PRECO: this.toNumber(record.preco),
        CDGRUIT: record.cdgruit,
        SUBGRU: record.subgru,
        ID_SUBGRUPO: subgroup.id,
        NEGATIVO: record.negativo,
        SALDO: saldoByCditem.get(record.cditem) ?? 0,
        URL: imageUrl,
      };
    });

    return plainToInstance(PublicItemPorCategoriaDto, mapped, {
      excludeExtraneousValues: true,
    });
  }
}
