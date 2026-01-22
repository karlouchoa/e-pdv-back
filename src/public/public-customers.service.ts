import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicClientDto } from './dto/public-client.dto';
import { PublicClientLookupDto } from './dto/public-client-lookup.dto';

@Injectable()
export class PublicCustomersService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  async findByPhone(tenant: string, dto: PublicClientLookupDto) {
    const rawTerm = (dto.termo ?? dto.telefone ?? '').trim();
    if (!rawTerm) {
      throw new BadRequestException('Informe o termo de busca.');
    }

    const normalized = rawTerm.replace(/\D/g, '');
    const term = normalized.length ? normalized : rawTerm;

    const prisma = await this.getPrisma(tenant);
    const records = await prisma.$queryRaw<PublicClientDto[]>`
      SELECT TOP 1
        id,
        cdcli,
        cdemp,
        decli,
        fantcli,
        dddcli,
        fonecli,
        celcli,
        emailcli,
        cnpj_cpfcli
      FROM t_cli
      WHERE CONCAT(ISNULL(dddcli, ''), ISNULL(fonecli, '')) = ${term}
    `;

    const record = records[0] ?? null;
    if (!record) {
      return null;
    }

    return plainToInstance(PublicClientDto, record, {
      excludeExtraneousValues: true,
    });
  }
}
