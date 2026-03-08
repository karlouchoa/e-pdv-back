import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTSubgrDto } from './dto/create-t_subgr.dto';
import { UpdateTSubgrDto } from './dto/update-t_subgr.dto';

@Injectable()
export class TSubgrService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string) {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private normalizeUuid(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }

  private async resolveGroupRelation(
    tenant: string,
    cdgru: number,
    idGrupo?: string,
  ) {
    const prisma = await this.getPrisma(tenant);
    const group = await prisma.t_gritens.findUnique({
      where: { cdgru },
      select: { cdgru: true, id: true },
    });

    if (!group) {
      throw new BadRequestException(
        `Grupo ${cdgru} nao encontrado em t_gritens.`,
      );
    }

    const groupId = this.normalizeUuid(group.id ?? undefined);
    const requestedGroupId = this.normalizeUuid(idGrupo);

    if (requestedGroupId && groupId && requestedGroupId !== groupId) {
      throw new BadRequestException(
        'ID do grupo nao corresponde ao grupo informado (cdgru).',
      );
    }

    if (requestedGroupId && !groupId) {
      throw new BadRequestException(
        'Grupo informado nao possui ID para vinculo com subgrupo.',
      );
    }

    return {
      cdgru: group.cdgru,
      idGrupo: groupId ?? requestedGroupId,
    };
  }

  async create(tenant: string, dto: CreateTSubgrDto) {
    const prisma = await this.getPrisma(tenant);
    const relation = await this.resolveGroupRelation(tenant, dto.cdgru, dto.id_grupo);

    return prisma.t_subgr.create({
      data: {
        cdgru: relation.cdgru,
        desub: dto.desub,
        idsugr: dto.idsugr,
        oldcod: dto.oldcod,
        cdsubext: dto.cdsubext,
        id_grupo: relation.idGrupo,
        dtaltsub: new Date(),
        updatedat: new Date(),
      },
    });
  }

  async update(tenant: string, id: number, dto: UpdateTSubgrDto) {
    const prisma = await this.getPrisma(tenant);
    const existing = await prisma.t_subgr.findUnique({
      where: { cdsub: id },
    });

    if (!existing) {
      throw new NotFoundException(`Subgrupo com ID ${id} nao encontrado.`);
    }

    const hasDataField =
      dto.cdgru !== undefined ||
      dto.desub !== undefined ||
      dto.id_grupo !== undefined ||
      dto.idsugr !== undefined ||
      dto.oldcod !== undefined ||
      dto.cdsubext !== undefined;

    if (!hasDataField) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar.',
      );
    }

    let relation:
      | {
          cdgru: number;
          idGrupo: string | null;
        }
      | undefined;

    if (dto.cdgru !== undefined || dto.id_grupo !== undefined) {
      relation = await this.resolveGroupRelation(
        tenant,
        dto.cdgru ?? existing.cdgru,
        dto.id_grupo,
      );
    }

    return prisma.t_subgr.update({
      where: { cdsub: id },
      data: {
        ...(relation ? { cdgru: relation.cdgru, id_grupo: relation.idGrupo } : {}),
        ...(dto.desub !== undefined ? { desub: dto.desub } : {}),
        ...(dto.idsugr !== undefined ? { idsugr: dto.idsugr } : {}),
        ...(dto.oldcod !== undefined ? { oldcod: dto.oldcod } : {}),
        ...(dto.cdsubext !== undefined ? { cdsubext: dto.cdsubext } : {}),
        dtaltsub: new Date(),
        updatedat: new Date(),
      },
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
    });
  }

  async findAll(
    tenant: string,
    filters?: { iniciais?: string; cdgru?: string; id_grupo?: string },
  ) {
    const prisma = await this.getPrisma(tenant);
    const rawCdgru = filters?.cdgru?.trim();
    const parsedCdgru =
      rawCdgru && Number.isFinite(Number(rawCdgru)) ? Number(rawCdgru) : null;
    const idGrupo = this.normalizeUuid(filters?.id_grupo);
    const iniciais = filters?.iniciais?.trim();

    return prisma.t_subgr.findMany({
      where: {
        ...(parsedCdgru !== null ? { cdgru: parsedCdgru } : {}),
        ...(idGrupo ? { id_grupo: idGrupo } : {}),
        ...(iniciais ? { desub: { startsWith: iniciais } } : {}),
      },
      orderBy: [{ cdgru: 'asc' }, { cdsub: 'asc' }],
    });
  }

  async findById(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_subgr.findUnique({
      where: { cdsub: id },
    });

    if (!record) {
      throw new NotFoundException(`Subgrupo com ID ${id} nao encontrado.`);
    }

    return record;
  }
}
