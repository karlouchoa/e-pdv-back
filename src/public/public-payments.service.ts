import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicFpgtoDto } from './dto/public-fpgto.dto';
import { PublicTpgtoDto } from './dto/public-tpgto.dto';

@Injectable()
export class PublicPaymentsService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  async listTpgto(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    const records = await prisma.t_tpgto.findMany({
      where: { OnLineSN: 'S' },
      orderBy: { detpg: 'asc' },
    });

    return plainToInstance(PublicTpgtoDto, records, {
      excludeExtraneousValues: true,
    });
  }

  async listFpgto(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    const records = await prisma.t_fpgto.findMany({
      where: { OnLineSN: 'S' },
      orderBy: { defpg: 'asc' },
    });

    return plainToInstance(PublicFpgtoDto, records, {
      excludeExtraneousValues: true,
    });
  }
}
