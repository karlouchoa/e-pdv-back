import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  PrismaClient as TenantClient,
  T_ItensCombo as TItensComboModel,
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

  private toResponse(record: TItensComboModel) {
    return plainToInstance(TItensComboResponseDto, record, {
      excludeExtraneousValues: true,
    });
  }

  private toResponseList(records: TItensComboModel[]) {
    return records.map((record) => this.toResponse(record));
  }

  private mapUpdateData(dto: UpdateTItensComboDto) {
    const data: Record<string, unknown> = {};

    if (dto.id_item !== undefined) {
      data.ID_ITEM = dto.id_item;
    }
    if (dto.cdgru !== undefined) {
      data.CDGRU = dto.cdgru;
    }
    if (dto.qtde !== undefined) {
      data.QTDE = dto.qtde;
    }

    return data;
  }

  async create(tenant: string, dto: CreateTItensComboDto) {
    const prisma = await this.getPrisma(tenant);

    const record = await prisma.t_ItensCombo.create({
      data: {
        ID_ITEM: dto.id_item,
        CDGRU: dto.cdgru,
        QTDE: dto.qtde,
      },
    });

    return this.toResponse(record);
  }

  async findAll(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    const records = await prisma.t_ItensCombo.findMany({
      orderBy: { AUTOCOD: 'asc' },
    });

    return this.toResponseList(records);
  }

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const record = await prisma.t_ItensCombo.findUnique({
      where: { ID: id },
    });

    if (!record) {
      throw new NotFoundException(`ItensCombo ${id} nao encontrado.`);
    }

    return this.toResponse(record);
  }

  async update(tenant: string, id: string, dto: UpdateTItensComboDto) {
    const prisma = await this.getPrisma(tenant);
    const data = this.mapUpdateData(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    const record = await prisma.t_ItensCombo.findUnique({
      where: { ID: id },
    });

    if (!record) {
      throw new NotFoundException(`ItensCombo ${id} nao encontrado.`);
    }

    const updated = await prisma.t_ItensCombo.update({
      where: { ID: id },
      data: {
        ...data,
        UPDATEDAT: new Date(),
      },
    });

    return this.toResponse(updated);
  }

  async remove(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);

    const record = await prisma.t_ItensCombo.findUnique({
      where: { ID: id },
    });

    if (!record) {
      throw new NotFoundException(`ItensCombo ${id} nao encontrado.`);
    }

    const deleted = await prisma.t_ItensCombo.delete({
      where: { ID: id },
    });

    return this.toResponse(deleted);
  }
}
