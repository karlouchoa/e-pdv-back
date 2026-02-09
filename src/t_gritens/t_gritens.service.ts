import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTGritensDto } from './dto/create-t_gritens.dto';
import { UpdateTGritensDto } from './dto/update-t_gritens.dto';

@Injectable()
export class TGritensService {
  constructor(private readonly tenantDBService: TenantDbService) {}

  private async getPrisma(tenant: string) {
    return this.tenantDBService.getTenantClient(tenant);
  }

  async create(tenant: string, dto: CreateTGritensDto) {
    const prisma = await this.getPrisma(tenant);

    return prisma.t_gritens.create({
      data: {
        degru: dto.degru,
        ativo: dto.ativo,
        perccomgru: dto.perccomgru,
        createdat: new Date(),
      },
    });
  }

  async update(tenant: string, id: number, dto: UpdateTGritensDto) {
    const prisma = await this.getPrisma(tenant);

    const existing = await prisma.t_gritens.findUnique({
      where: { cdgru: id },
    });

    if (!existing) {
      throw new NotFoundException(`Grupo com ID ${id} não encontrado`);
    }

    return prisma.t_gritens.update({
      where: { cdgru: id },
      data: {
        ...dto,
        updatedat: new Date(),
      },
    });
  }

  async remove(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);

    return prisma.t_gritens.update({
      where: { cdgru: id },
      data: {
        isdeleted: true,
        ativo: 'N',
        updatedat: new Date(),
      },
    });
  }

  async findAll(tenant: string, iniciais?: string) {
    const prisma = await this.getPrisma(tenant);
    const trimmedIniciais = typeof iniciais === 'string' ? iniciais.trim() : '';

    return prisma.t_gritens.findMany({
      where: {
        isdeleted: false,
        ...(trimmedIniciais ? { degru: { startsWith: trimmedIniciais } } : {}),
      },
    });
  }

  async findById(tenant: string, id: number) {
    const prisma = await this.getPrisma(tenant);

    const record = await prisma.t_gritens.findFirst({
      where: { cdgru: id, isdeleted: false },
    });

    if (!record) {
      throw new NotFoundException(`Grupo com ID ${id} nao encontrado`);
    }

    return record;
  }
}
