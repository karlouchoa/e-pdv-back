import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import {
  listCompatibleComboRulesByItemCodes,
  resolveCompatibleComboSubgroup,
} from '../lib/combo-schema-compat';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicItemPorCategoriaDto } from './dto/public-item-por-categoria.dto';
import { PublicItensComboItemDto } from './dto/public-itenscombo-item.dto';

@Injectable()
export class PublicCatalogService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClientBySubdomain(tenant);
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

  private parsePositiveInteger(
    value: string,
    fieldName: 'item' | 'subgrupo',
  ): number {
    const parsed = Number(String(value ?? '').trim());
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${fieldName} invalido. Informe um codigo numerico maior que zero.`,
      );
    }
    return parsed;
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

  async listItensComboByItem(tenant: string, idItem: string) {
    const prisma = await this.getPrisma(tenant);
    const cditem = this.parsePositiveInteger(idItem, 'item');
    const item = await prisma.t_itens.findFirst({
      where: { cditem },
      select: { cditem: true },
    });

    if (!item) {
      return [];
    }

    const records = await listCompatibleComboRulesByItemCodes(prisma, [cditem]);
    const mapped = records.map((record) => ({
      AUTOCOD: record.autocod,
      ID:
        record.autocod !== null
          ? String(record.autocod)
          : `${record.cditem ?? cditem}:${record.cdgru}`,
      ID_ITEM: String(record.cditem ?? cditem),
      CDITEM: record.cditem ?? cditem,
      CDGRU: record.cdgru,
      QTDE: this.toNumber(record.qtde) ?? 0,
      ID_SUBGRUPO: String(record.cdgru),
      DEGRU: record.subgroupLabel ?? null,
      NEGATIVO: null,
      SALDO: null,
      CREATEDAT: record.createdat,
      UPDATEDAT: record.updatedat,
    }));

    return plainToInstance(PublicItensComboItemDto, mapped, {
      excludeExtraneousValues: true,
    });
  }

  async listItensPorCategoria(tenant: string, subgroupIdentifier: string) {
    const prisma = await this.getPrisma(tenant);
    const subgroupId = this.parsePositiveInteger(
      subgroupIdentifier,
      'subgrupo',
    );
    const subgroup = await resolveCompatibleComboSubgroup(prisma, subgroupId);

    if (!subgroup) {
      throw new BadRequestException(`Subgrupo ${subgroupId} nao encontrado.`);
    }
    if (!subgroup.cdsub) {
      throw new BadRequestException(
        `Subgrupo ${subgroupId} sem codigo de subgrupo (cdsub).`,
      );
    }

    const records = await prisma.t_itens.findMany({
      where: {
        ativosn: 'S',
        subgru: subgroup.cdsub,
      },
      orderBy: [{ cditem: 'asc' }],
      select: {
        cditem: true,
        deitem: true,
        defat: true,
        undven: true,
        preco: true,
        negativo: true,
        cdgruit: true,
        subgru: true,
        locfotitem: true,
        cdemp: true,
      },
    });

    const saldoByCditem = await this.fetchSaldoByCditem(
      prisma,
      records.map((record) => record.cditem),
    );

    const images = records.length
      ? await prisma.t_imgitens.findMany({
          where: {
            cditem: { in: records.map((record) => record.cditem) },
            empitem: { in: records.map((record) => record.cdemp) },
          },
          orderBy: [{ autocod: 'asc' }],
          select: {
            cditem: true,
            empitem: true,
            url: true,
          },
        })
      : [];

    const imageMap = new Map<string, string[]>();
    for (const image of images) {
      if (image.cditem === null || image.empitem === null) continue;
      const url = this.normalizeUrl(image.url);
      if (!url) continue;
      const key = `${image.empitem}:${image.cditem}`;
      const bucket = imageMap.get(key) ?? [];
      bucket.push(url);
      imageMap.set(key, bucket);
    }

    const mapped = records.map((record) => {
      const imageUrl =
        imageMap.get(`${record.cdemp}:${record.cditem}`)?.[0] ??
        this.normalizeUrl(record.locfotitem);

      return {
        ID: String(record.cditem),
        CDITEM: record.cditem,
        DEITEM: record.deitem,
        DEFAT: record.defat,
        UNDVEN: record.undven,
        PRECO: this.toNumber(record.preco),
        CDGRUIT: record.cdgruit,
        SUBGRU: record.subgru,
        ID_SUBGRUPO: String(subgroupId),
        NEGATIVO: record.negativo,
        SALDO: saldoByCditem.get(record.cditem) ?? 0,
        URL: imageUrl ?? null,
      };
    });

    return plainToInstance(PublicItemPorCategoriaDto, mapped, {
      excludeExtraneousValues: true,
    });
  }
}
