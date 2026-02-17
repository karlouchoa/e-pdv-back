import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { UpsertPublicClientDto } from './dto/upsert-public-client.dto';
import { PublicClientDto } from './dto/public-client.dto';
import { PublicClientAddressDto } from './dto/public-client-address.dto';
import { PublicClientLookupDto } from './dto/public-client-lookup.dto';

type TenantClientLike = TenantClient | Prisma.TransactionClient;
type PublicClientRow = {
  id: string;
  cdcli: number;
  cdemp: number;
  decli?: string | null;
  fantcli?: string | null;
  dddcli?: string | null;
  fonecli?: string | null;
  celcli?: string | null;
  emailcli?: string | null;
  cnpj_cpfcli?: string | null;
};

@Injectable()
export class PublicCustomersService {
  private readonly defaultCompanyId = 1;

  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClientBySubdomain(tenant);
  }

  private normalizeText(value: unknown, maxLen: number): string | null {
    const normalized = (value ?? '').toString().trim();
    if (!normalized) return null;
    return normalized.slice(0, maxLen);
  }

  private normalizeDigits(value: unknown): string {
    return (value ?? '').toString().replace(/\D/g, '');
  }

  private splitPhoneDigits(phoneDigits: string): {
    ddd: string;
    phone: string;
  } {
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      throw new BadRequestException('Telefone invalido. Informe DDD + numero.');
    }

    return {
      ddd: phoneDigits.slice(0, 2),
      phone: phoneDigits.slice(2),
    };
  }

  private normalizeUf(value: unknown): string | null {
    const normalized = this.normalizeText(value, 2);
    return normalized ? normalized.toUpperCase() : null;
  }

  private async resolveDefaultCompanyId(
    prisma: TenantClientLike,
  ): Promise<number> {
    const matriz = await prisma.t_emp.findFirst({
      where: {
        OR: [{ matriz: 'S' }, { matriz: 's' }],
      },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    if (matriz?.cdemp) return matriz.cdemp;

    const first = await prisma.t_emp.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    return first?.cdemp ?? this.defaultCompanyId;
  }

  private async listAddresses(
    prisma: TenantClientLike,
    clientId: string,
  ): Promise<PublicClientAddressDto[]> {
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
      WHERE ID_CLIENTE = ${clientId}
        AND ISNULL(ISDELETED, 0) = 0
      ORDER BY CREATEDAT DESC, ID DESC
    `;

    return plainToInstance(PublicClientAddressDto, addresses ?? [], {
      excludeExtraneousValues: true,
    });
  }

  private toPublicClient(
    record: PublicClientRow,
    enderecos: PublicClientAddressDto[],
  ): PublicClientDto {
    return plainToInstance(
      PublicClientDto,
      { ...record, enderecos },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async syncAddressLocation(
    prisma: TenantClientLike,
    addressId: string,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): Promise<void> {
    if (latitude === undefined && longitude === undefined) return;

    await prisma.$executeRaw(
      TenantPrisma.sql`
        UPDATE T_ENDCLI
        SET [location] = CASE
          WHEN ${latitude ?? null} IS NULL OR ${longitude ?? null} IS NULL THEN NULL
          ELSE geography::Point(${latitude ?? null}, ${longitude ?? null}, 4326)
        END
        WHERE ID = ${addressId}
      `,
    );
  }

  async findByPhone(tenant: string, dto: PublicClientLookupDto) {
    const rawTerm = (dto.termo ?? dto.telefone ?? '').trim();
    if (!rawTerm) {
      throw new BadRequestException('Informe o termo de busca.');
    }

    const normalized = rawTerm.replace(/\D/g, '');
    const term = normalized.length ? normalized : rawTerm;
    const cdemp = dto.cdemp ?? null;

    const prisma = await this.getPrisma(tenant);
    const records = await prisma.$queryRaw<PublicClientRow[]>`
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
      WHERE (
        CONCAT(ISNULL(dddcli, ''), ISNULL(fonecli, '')) = ${term}
        OR CONCAT(ISNULL(dddcli, ''), ISNULL(celcli, '')) = ${term}
        OR ISNULL(fonecli, '') = ${term}
        OR ISNULL(celcli, '') = ${term}
      )
        AND (${cdemp} IS NULL OR cdemp = ${cdemp})
        AND ISNULL(isdeleted, 0) = 0
      ORDER BY ISNULL(updatedat, createdat) DESC, id DESC
    `;

    const record = records[0] ?? null;
    if (!record) {
      return null;
    }

    const enderecos = await this.listAddresses(prisma, record.id);
    return this.toPublicClient(record, enderecos);
  }

  async upsertPublicClient(tenant: string, dto: UpsertPublicClientDto) {
    const nome = this.normalizeText(dto.nome, 60);
    if (!nome || nome.length < 2) {
      throw new BadRequestException('Informe o nome do cliente.');
    }

    const phoneDigits = this.normalizeDigits(dto.telefone);
    const { ddd, phone } = this.splitPhoneDigits(phoneDigits);
    const email = this.normalizeText(dto.email, 60);
    const cpfCnpj = this.normalizeText(dto.cpfCnpj, 18);

    const prisma = await this.getPrisma(tenant);

    return prisma.$transaction(async (tx) => {
      const cdemp =
        dto.cdemp && dto.cdemp > 0
          ? dto.cdemp
          : await this.resolveDefaultCompanyId(tx);

      const existing = await tx.t_cli.findFirst({
        where: {
          cdemp,
          dddcli: ddd,
          AND: [
            { OR: [{ fonecli: phone }, { celcli: phone }] },
            { OR: [{ isdeleted: false }, { isdeleted: null }] },
          ],
        },
        select: { id: true },
      });

      const now = new Date();
      const client = existing
        ? await tx.t_cli.update({
            where: { id: existing.id },
            data: {
              decli: nome,
              fantcli: nome,
              dddcli: ddd,
              fonecli: phone,
              celcli: phone,
              emailcli: email,
              cnpj_cpfcli: cpfCnpj,
              ativocli: 'S',
              updatedat: now,
            },
            select: {
              id: true,
              cdcli: true,
              cdemp: true,
              decli: true,
              fantcli: true,
              dddcli: true,
              fonecli: true,
              celcli: true,
              emailcli: true,
              cnpj_cpfcli: true,
            },
          })
        : await tx.t_cli.create({
            data: {
              cdemp,
              tipocli: 'F',
              decli: nome,
              fantcli: nome,
              dddcli: ddd,
              fonecli: phone,
              celcli: phone,
              emailcli: email,
              cnpj_cpfcli: cpfCnpj,
              usucadcli: 'PUBLIC',
              userrestcli: 'PUBLIC',
              ativocli: 'S',
            },
            select: {
              id: true,
              cdcli: true,
              cdemp: true,
              decli: true,
              fantcli: true,
              dddcli: true,
              fonecli: true,
              celcli: true,
              emailcli: true,
              cnpj_cpfcli: true,
            },
          });

      let selectedAddressId: string | null = null;

      if (dto.endereco) {
        const latitude =
          dto.endereco.latitude === undefined ? null : dto.endereco.latitude;
        const longitude =
          dto.endereco.longitude === undefined ? null : dto.endereco.longitude;

        if (dto.endereco.id) {
          const existingAddress = await tx.t_ENDCLI.findFirst({
            where: {
              ID: dto.endereco.id,
              ID_CLIENTE: client.id,
              ISDELETED: false,
            },
            select: { ID: true },
          });

          if (!existingAddress) {
            throw new NotFoundException(
              'Endereco nao encontrado para o cliente.',
            );
          }

          const updatedAddress = await tx.t_ENDCLI.update({
            where: { ID: existingAddress.ID },
            data: {
              CEP: this.normalizeText(dto.endereco.cep, 10),
              LOGRADOURO: this.normalizeText(dto.endereco.logradouro, 100),
              NUMERO: this.normalizeText(dto.endereco.numero, 20),
              BAIRRO: this.normalizeText(dto.endereco.bairro, 60),
              CIDADE: this.normalizeText(dto.endereco.cidade, 60),
              UF: this.normalizeUf(dto.endereco.uf),
              COMPLEMENTO: this.normalizeText(dto.endereco.complemento, 100),
              PONTO_REFERENCIA: this.normalizeText(
                dto.endereco.pontoReferencia,
                255,
              ),
              TIPO_LOCAL: this.normalizeText(dto.endereco.tipoLocal, 20),
              INSTRUCOES_ENTREGA: this.normalizeText(
                dto.endereco.instrucoesEntrega,
                2000,
              ),
              LATITUDE: latitude,
              LONGITUDE: longitude,
              TIPO_ENDERECO: this.normalizeText(dto.endereco.tipoEndereco, 3),
              UPDATEDAT: now,
            },
            select: { ID: true },
          });

          selectedAddressId = updatedAddress.ID;
          if (selectedAddressId) {
            await this.syncAddressLocation(
              tx,
              selectedAddressId,
              latitude,
              longitude,
            );
          }
        } else {
          const createdAddress = await tx.t_ENDCLI.create({
            data: {
              ID_CLIENTE: client.id,
              CEP: this.normalizeText(dto.endereco.cep, 10),
              LOGRADOURO: this.normalizeText(dto.endereco.logradouro, 100),
              NUMERO: this.normalizeText(dto.endereco.numero, 20),
              BAIRRO: this.normalizeText(dto.endereco.bairro, 60),
              CIDADE: this.normalizeText(dto.endereco.cidade, 60),
              UF: this.normalizeUf(dto.endereco.uf),
              COMPLEMENTO: this.normalizeText(dto.endereco.complemento, 100),
              PONTO_REFERENCIA: this.normalizeText(
                dto.endereco.pontoReferencia,
                255,
              ),
              TIPO_LOCAL: this.normalizeText(dto.endereco.tipoLocal, 20),
              INSTRUCOES_ENTREGA: this.normalizeText(
                dto.endereco.instrucoesEntrega,
                2000,
              ),
              LATITUDE: latitude,
              LONGITUDE: longitude,
              TIPO_ENDERECO:
                this.normalizeText(dto.endereco.tipoEndereco, 3) ?? 'ENT',
              CDUSU: 'PUBLIC',
            },
            select: { ID: true },
          });

          selectedAddressId = createdAddress.ID;
          if (selectedAddressId) {
            await this.syncAddressLocation(
              tx,
              selectedAddressId,
              latitude,
              longitude,
            );
          }
        }
      }

      const enderecos = await this.listAddresses(tx, client.id);
      return {
        client: this.toPublicClient(client, enderecos),
        selectedAddressId: selectedAddressId ?? enderecos[0]?.id ?? null,
      };
    });
  }
}
