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
    cdcli: number,
  ): Promise<PublicClientAddressDto[]> {
    const addresses = await prisma.$queryRaw<PublicClientAddressDto[]>`
      SELECT
        AUTOCOD AS id,
        CDCLI AS cdcli,
        cep AS cep,
        logradouro AS logradouro,
        numero AS numero,
        bairro AS bairro,
        cidade AS cidade,
        uf AS uf,
        complemento AS complemento,
        ponto_referencia AS ponto_referencia,
        tipo_local AS tipo_local,
        instrucoes_entrega AS instrucoes_entrega,
        latitude AS latitude,
        longitude AS longitude,
        tipo_endereco AS tipo_endereco
      FROM t_endcli
      WHERE CDCLI = ${cdcli}
        AND COALESCE(isdeleted, false) = false
      ORDER BY createdat DESC, AUTOCOD DESC
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
    addressId: number,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): Promise<void> {
    if (latitude === undefined && longitude === undefined) return;

    await prisma.$executeRaw(
      TenantPrisma.sql`
        UPDATE t_endcli
        SET location = CASE
          WHEN ${latitude ?? null} IS NULL OR ${longitude ?? null} IS NULL THEN NULL
          ELSE POINT(${longitude ?? null}, ${latitude ?? null})
        END
        WHERE AUTOCOD = ${addressId}
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
      SELECT
        cdcli AS id,
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
        CONCAT(COALESCE(dddcli, ''), COALESCE(fonecli, '')) = ${term}
        OR CONCAT(COALESCE(dddcli, ''), COALESCE(celcli, '')) = ${term}
        OR COALESCE(fonecli, '') = ${term}
        OR COALESCE(celcli, '') = ${term}
      )
        AND (${cdemp} IS NULL OR cdemp = ${cdemp})
        AND COALESCE(isdeleted, false) = false
      ORDER BY COALESCE(updatedat, createdat) DESC, cdcli DESC
      LIMIT 1
    `;

    const record = records[0] ?? null;
    if (!record) {
      return null;
    }

    const enderecos = await this.listAddresses(prisma, record.cdcli);
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
        select: { cdcli: true },
      });

      const now = new Date();
      const existingCdcli =
        typeof existing?.cdcli === 'number' ? existing.cdcli : null;
      const client = existingCdcli !== null
        ? await tx.t_cli.update({
            where: { cdcli: existingCdcli },
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

      const clientRecord: PublicClientRow = {
        ...client,
        id: String(client.cdcli),
      };

      let selectedAddressId: string | null = null;

      if (dto.endereco) {
        const cep = this.normalizeText(dto.endereco.cep, 10);
        const logradouro = this.normalizeText(dto.endereco.logradouro, 100);
        const numero = this.normalizeText(dto.endereco.numero, 20);
        const bairro = this.normalizeText(dto.endereco.bairro, 60);
        const cidade = this.normalizeText(dto.endereco.cidade, 60);
        const uf = this.normalizeUf(dto.endereco.uf);
        if (!cep || !numero || !bairro || !cidade) {
          throw new BadRequestException(
            'Endereco incompleto. Informe cep, numero (ou S/N), bairro e cidade.',
          );
        }

        const latitude =
          dto.endereco.latitude === undefined ? null : dto.endereco.latitude;
        const longitude =
          dto.endereco.longitude === undefined ? null : dto.endereco.longitude;

        if (dto.endereco.id) {
          const existingAddress = await tx.t_endcli.findFirst({
            where: {
              autocod: dto.endereco.id,
              cdcli: client.cdcli,
              isdeleted: false,
            },
            select: { autocod: true },
          });

          if (!existingAddress) {
            throw new NotFoundException(
              'Endereco nao encontrado para o cliente.',
            );
          }

          const updatedAddress = await tx.t_endcli.update({
            where: { autocod: existingAddress.autocod },
            data: {
              cep: cep,
              logradouro: logradouro,
              numero: numero,
              bairro: bairro,
              cidade: cidade,
              uf: uf,
              complemento: this.normalizeText(dto.endereco.complemento, 100),
              ponto_referencia: this.normalizeText(
                dto.endereco.pontoReferencia,
                255,
              ),
              tipo_local: this.normalizeText(dto.endereco.tipoLocal, 20),
              instrucoes_entrega: this.normalizeText(
                dto.endereco.instrucoesEntrega,
                2000,
              ),
              latitude: latitude,
              longitude: longitude,
              tipo_endereco: this.normalizeText(dto.endereco.tipoEndereco, 3),
              updatedat: now,
            },
            select: { autocod: true },
          });

          selectedAddressId = String(updatedAddress.autocod);
          if (selectedAddressId) {
            await this.syncAddressLocation(
              tx,
              updatedAddress.autocod,
              latitude,
              longitude,
            );
          }
        } else {
          const createdAddress = await tx.t_endcli.create({
            data: {
              cdcli: client.cdcli,
              cep: cep,
              logradouro: logradouro,
              numero: numero,
              bairro: bairro,
              cidade: cidade,
              uf: uf,
              complemento: this.normalizeText(dto.endereco.complemento, 100),
              ponto_referencia: this.normalizeText(
                dto.endereco.pontoReferencia,
                255,
              ),
              tipo_local: this.normalizeText(dto.endereco.tipoLocal, 20),
              instrucoes_entrega: this.normalizeText(
                dto.endereco.instrucoesEntrega,
                2000,
              ),
              latitude: latitude,
              longitude: longitude,
              tipo_endereco:
                this.normalizeText(dto.endereco.tipoEndereco, 3) ?? 'ENT',
              cdusu: 'PUBLIC',
            },
            select: { autocod: true },
          });

          selectedAddressId = String(createdAddress.autocod);
          if (selectedAddressId) {
            await this.syncAddressLocation(
              tx,
              createdAddress.autocod,
              latitude,
              longitude,
            );
          }
        }
      }

      const enderecos = await this.listAddresses(tx, client.cdcli);
      return {
        client: this.toPublicClient(clientRecord, enderecos),
        selectedAddressId: selectedAddressId ?? enderecos[0]?.id ?? null,
      };
    });
  }
}
