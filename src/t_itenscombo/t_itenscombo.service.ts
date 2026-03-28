import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  PrismaClient as TenantClient,
  t_itenscombo as TItensComboModel,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTItensComboDto } from './dto/create-t_itenscombo.dto';
import { TItensComboResponseDto } from './dto/t_itenscombo-response.dto';
import { UpdateTItensComboDto } from './dto/update-t_itenscombo.dto';

@Injectable()
export class TItensComboService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toResponse(
    record: TItensComboModel & { subgroup?: { cdsub: number; desub: string } | null },
  ) {
    return plainToInstance(
      TItensComboResponseDto,
      {
        AUTOCOD: record.autocod,
        ID: String(record.autocod),
        ID_ITEM: String(record.cditem ?? ''),
        CDITEM: record.cditem ?? 0,
        CDGRU: record.cdgru,
        QTDE: Number(record.qtde),
        ID_SUBGRUPO: String(record.cdgru),
        DEGRU: record.subgroup?.desub ?? null,
        CREATEDAT: record.createdat,
        UPDATEDAT: record.updatedat,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toResponseList(
    records: Array<TItensComboModel & { subgroup?: { cdsub: number; desub: string } | null }>,
  ) {
    return records.map((record) => this.toResponse(record));
  }

  private async attachSubgroups(
    prisma: TenantClient,
    records: TItensComboModel[],
  ) {
    const subgroupMap = new Map(
      (
        await prisma.t_subgr.findMany({
          where: { cdsub: { in: records.map((record) => record.cdgru) } },
          select: { cdsub: true, desub: true },
        })
      ).map((record) => [record.cdsub, record]),
    );

    return records.map((record) => ({
      ...record,
      subgroup: subgroupMap.get(record.cdgru) ?? null,
    }));
  }

  async create(tenant: string, dto: CreateTItensComboDto) {
    if (!dto.cditem) {
      throw new BadRequestException('cditem e obrigatorio para cadastrar combo.');
    }

    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_itenscombo.create({
      data: {
        cditem: dto.cditem,
        cdgru: dto.cdgru,
        qtde: dto.qtde,
      },
    });
    const [hydrated] = await this.attachSubgroups(prisma, [record]);
    return this.toResponse(hydrated);
  }

  async findAll(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    const records = await prisma.t_itenscombo.findMany({
      orderBy: { autocod: 'asc' },
    });
    return this.toResponseList(await this.attachSubgroups(prisma, records));
  }

  async findByItemId(tenant: string, idItem: string) {
    const prisma = await this.getPrisma(tenant);
    const cditem = Number(String(idItem).trim());
    if (!Number.isInteger(cditem) || cditem <= 0) {
      throw new BadRequestException('idItem invalido.');
    }
    const records = await prisma.t_itenscombo.findMany({
      where: { cditem },
      orderBy: [{ cdgru: 'asc' }, { autocod: 'asc' }],
    });
    return this.toResponseList(await this.attachSubgroups(prisma, records));
  }

  async findOne(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_itenscombo.findUnique({
      where: { autocod: id },
    });

    if (!record) {
      throw new NotFoundException(`ItensCombo ${id} nao encontrado.`);
    }

    const [hydrated] = await this.attachSubgroups(prisma, [record]);
    return this.toResponse(hydrated);
  }

  async update(tenant: string, id: number, dto: UpdateTItensComboDto) {
    const prisma = await this.getPrisma(tenant);
    const data: Partial<TItensComboModel> = {};
    if (dto.cditem !== undefined) {
      data.cditem = dto.cditem;
    }
    if (dto.cdgru !== undefined) {
      data.cdgru = dto.cdgru;
    }
    if (dto.qtde !== undefined) {
      data.qtde = dto.qtde as any;
    }
    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'Informe ao menos cditem, cdgru ou qtde para atualizar.',
      );
    }

    const record = await prisma.t_itenscombo.update({
      where: { autocod: id },
      data: {
        ...data,
        updatedat: new Date(),
      },
    });
    const [hydrated] = await this.attachSubgroups(prisma, [record]);
    return this.toResponse(hydrated);
  }

  async remove(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_itenscombo.delete({
      where: { autocod: id },
    });
    const [hydrated] = await this.attachSubgroups(prisma, [record]);
    return this.toResponse(hydrated);
  }
}
