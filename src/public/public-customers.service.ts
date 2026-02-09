import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { PublicClientDto } from './dto/public-client.dto';
import { PublicClientAddressDto } from './dto/public-client-address.dto';
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

    const addresses = await prisma.$queryRaw<PublicClientAddressDto[]>`
      SELECT
        ID AS id,
        ID_CLIENTE AS id_cliente,
        CEP AS cep,
        LOGRADOURO AS logradouro,
        NUMERO AS numero,
        BAIRRO AS bairro,
        CIDADE AS cidade,
        UF AS uf,
        COMPLEMENTO AS complemento,
        PONTO_REFERENCIA AS ponto_referencia,
        TIPO_LOCAL AS tipo_local,
        INSTRUCOES_ENTREGA AS instrucoes_entrega,
        LATITUDE AS latitude,
        LONGITUDE AS longitude,
        TIPO_ENDERECO AS tipo_endereco
      FROM T_ENDCLI
      WHERE ID_CLIENTE = ${record.id}
        AND ISNULL(ISDELETED, 0) = 0
      ORDER BY CREATEDAT DESC, ID DESC
    `;

    const enderecos = plainToInstance(PublicClientAddressDto, addresses ?? [], {
      excludeExtraneousValues: true,
    });

    return plainToInstance(
      PublicClientDto,
      { ...record, enderecos },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
