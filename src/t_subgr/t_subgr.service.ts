import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma as PrismaTypes } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTSubgrDto } from './dto/create-t_subgr.dto';
import { UpdateTSubgrDto } from './dto/update-t_subgr.dto';
import {
  buildCompatibleScalarSelect,
  filterCompatibleScalarData,
} from '../lib/tenant-schema-compat';

@Injectable()
export class TSubgrService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string) {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private async buildTSubgrSelect(
    prisma: Awaited<ReturnType<TSubgrService['getPrisma']>>,
    fields?: Iterable<string>,
  ) {
    return buildCompatibleScalarSelect(prisma, 't_subgr', fields);
  }

  private async sanitizeTSubgrData(
    prisma: Awaited<ReturnType<TSubgrService['getPrisma']>>,
    data: Record<string, unknown>,
  ) {
    return filterCompatibleScalarData(prisma, 't_subgr', data);
  }

  private async ensureGroupExists(tenant: string, cdgru: number) {
    const prisma = await this.getPrisma(tenant);
    const group = await prisma.t_gritens.findUnique({
      where: { cdgru },
      select: { cdgru: true },
    });

    if (!group) {
      throw new BadRequestException(
        `Grupo ${cdgru} nao encontrado em t_gritens.`,
      );
    }
    return group.cdgru;
  }

  async create(tenant: string, dto: CreateTSubgrDto) {
    const prisma = await this.getPrisma(tenant);
    const cdgru = await this.ensureGroupExists(tenant, dto.cdgru);
    const data = (await this.sanitizeTSubgrData(prisma, {
      cdgru,
      desub: dto.desub,
      idsugr: dto.idsugr,
      oldcod: dto.oldcod,
      cdsubext: dto.cdsubext,
      dtaltsub: new Date(),
      updatedat: new Date(),
    })) as PrismaTypes.t_subgrUncheckedCreateInput;

    return prisma.t_subgr.create({
      data,
      select: await this.buildTSubgrSelect(prisma),
    });
  }

  async update(tenant: string, id: number, dto: UpdateTSubgrDto) {
    const prisma = await this.getPrisma(tenant);
    const existing = await prisma.t_subgr.findUnique({
      where: { cdsub: id },
      select: { cdsub: true },
    });

    if (!existing) {
      throw new NotFoundException(`Subgrupo com ID ${id} nao encontrado.`);
    }

    const hasDataField =
      dto.cdgru !== undefined ||
      dto.desub !== undefined ||
      dto.idsugr !== undefined ||
      dto.oldcod !== undefined ||
      dto.cdsubext !== undefined;

    if (!hasDataField) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar.',
      );
    }

    let resolvedCdgru: number | undefined;

    if (dto.cdgru !== undefined) {
      resolvedCdgru = await this.ensureGroupExists(tenant, dto.cdgru);
    }

    const data = (await this.sanitizeTSubgrData(prisma, {
      ...(resolvedCdgru !== undefined ? { cdgru: resolvedCdgru } : {}),
      ...(dto.desub !== undefined ? { desub: dto.desub } : {}),
      ...(dto.idsugr !== undefined ? { idsugr: dto.idsugr } : {}),
      ...(dto.oldcod !== undefined ? { oldcod: dto.oldcod } : {}),
      ...(dto.cdsubext !== undefined ? { cdsubext: dto.cdsubext } : {}),
      dtaltsub: new Date(),
      updatedat: new Date(),
    })) as PrismaTypes.t_subgrUncheckedUpdateInput;

    return prisma.t_subgr.update({
      where: { cdsub: id },
      data,
      select: await this.buildTSubgrSelect(prisma),
    });
  }

  async remove(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const existing = await prisma.t_subgr.findUnique({
      where: { cdsub: id },
      select: { cdsub: true },
    });

    if (!existing) {
      throw new NotFoundException(`Subgrupo com ID ${id} nao encontrado.`);
    }

    return prisma.t_subgr.delete({
      where: { cdsub: id },
      select: await this.buildTSubgrSelect(prisma),
    });
  }

  async findAll(
    tenant: string,
    filters?: { iniciais?: string; cdgru?: string },
  ) {
    const prisma = await this.getPrisma(tenant);
    const rawCdgru = filters?.cdgru?.trim();
    const parsedCdgru =
      rawCdgru && Number.isFinite(Number(rawCdgru)) ? Number(rawCdgru) : null;
    const iniciais = filters?.iniciais?.trim();

    return prisma.t_subgr.findMany({
      where: {
        ...(parsedCdgru !== null ? { cdgru: parsedCdgru } : {}),
        ...(iniciais ? { desub: { startsWith: iniciais } } : {}),
      },
      orderBy: [{ cdgru: 'asc' }, { cdsub: 'asc' }],
      select: await this.buildTSubgrSelect(prisma),
    });
  }

  async findById(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_subgr.findUnique({
      where: { cdsub: id },
      select: await this.buildTSubgrSelect(prisma),
    });

    if (!record) {
      throw new NotFoundException(`Subgrupo com ID ${id} nao encontrado.`);
    }

    return record;
  }
}
