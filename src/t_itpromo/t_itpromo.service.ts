import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTItpromoDto } from './dto/create-t_itpromo.dto';
import { TItpromoPublicDto } from './dto/t_itpromo-public.dto';
import { TItpromoRecordDto } from './dto/t_itpromo-record.dto';
import { UpdateTItpromoDto } from './dto/update-t_itpromo.dto';

const T_ITPROMO_FIELD_MAP = {
  empromo: 'EMPROMO',
  cdpromo: 'CDPROMO',
  cditem: 'CDITEM',
  preco: 'PRECO',
  precomin: 'PRECOMIN',
  precopromo: 'PRECOPROMO',
  meta: 'META',
  empitem: 'EMPITEM',
  undven: 'UNDVEN',
  custo: 'CUSTO',
  autocodext: 'AUTOCODEXT',
  hostname: 'HOSTNAME',
  ip: 'IP',
  data_promo: 'DATA_PROMO',
  id_item: 'ID_ITEM',
} as const;

const T_ITPROMO_OUTPUT_COLUMNS = [
  'autocod',
  'empromo',
  'cdpromo',
  'cditem',
  'preco',
  'precomin',
  'precopromo',
  'meta',
  'empitem',
  'undven',
  'custo',
  'autocodext',
  'hostname',
  'ip',
  'CreatedAt',
  'UpdatedAt',
  'DATA_PROMO',
  'ID_ITEM',
];

@Injectable()
export class TItpromoService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toPublicResponse(records: TItpromoPublicDto[]) {
    return plainToInstance(TItpromoPublicDto, records, {
      excludeExtraneousValues: true,
    });
  }

  private toRecordResponse(record: TItpromoRecordDto) {
    return plainToInstance(TItpromoRecordDto, record, {
      excludeExtraneousValues: true,
    });
  }

  private buildEntries(dto: CreateTItpromoDto | UpdateTItpromoDto) {
    const entries = Object.entries(T_ITPROMO_FIELD_MAP)
      .map(([key, column]) => ({
        column,
        value: (dto as Record<string, unknown>)[key],
      }))
      .filter((entry) => entry.value !== undefined);

    if (!entries.length) {
      throw new BadRequestException('Informe ao menos um campo.');
    }

    return entries;
  }

  private buildColumnList(columns: string[]) {
    return columns.map((column) => TenantPrisma.raw(`[${column}]`));
  }

  private buildOutputColumns(prefix: 'INSERTED' | 'DELETED') {
    return T_ITPROMO_OUTPUT_COLUMNS.map((column) =>
      TenantPrisma.raw(`${prefix}.[${column}] AS [${column}]`),
    );
  }

  async findPublic(tenant: string) {
    const prisma = await this.getPrisma(tenant);

    const records = await prisma.$queryRaw<TItpromoPublicDto[]>`
      SELECT
        T_ITPROMO.EMPROMO AS EMPROMO,
        T_ITENS.CDITEM AS CDITEM,
        T_ITENS.DEITEM AS DEITEM,
        T_ITENS.UNDVEN AS UNDVEN,
        T_ITENS.PRECO AS PRECO,
        T_ITPROMO.PRECOPROMO AS PRECOPROMO,
        CASE
          WHEN T_ITPROMO.DATA_PROMO < CONVERT(char(10), GETDATE(), 23) THEN NULL
          ELSE T_ITPROMO.DATA_PROMO
        END AS DATA_PROMO,
        T_ITENS.CDEMP AS CDEMP,
        T_ITENS.PRECOMIN AS PRECOMIN,
        T_ITENS.CUSTO AS CUSTO
      FROM T_ITENS
      LEFT JOIN T_ITPROMO ON T_ITPROMO.ID_ITEM = T_ITENS.ID
      WHERE T_ITPROMO.DATA_PROMO >= GETDATE()
    `;

    return this.toPublicResponse(records);
  }

  async create(tenant: string, dto: CreateTItpromoDto) {
    const prisma = await this.getPrisma(tenant);
    const entries = this.buildEntries(dto);
    const columns = this.buildColumnList(entries.map((entry) => entry.column));
    const values = entries.map((entry) => entry.value);
    const output = this.buildOutputColumns('INSERTED');

    const records = await prisma.$queryRaw<TItpromoRecordDto[]>(
      TenantPrisma.sql`
        INSERT INTO T_ITPROMO (${TenantPrisma.join(columns)})
        OUTPUT ${TenantPrisma.join(output)}
        VALUES (${TenantPrisma.join(values)})
      `,
    );

    const record = records[0];
    if (!record) {
      throw new BadRequestException('Falha ao inserir em T_ITPROMO.');
    }

    return this.toRecordResponse(record);
  }

  async update(tenant: string, autocod: number, dto: UpdateTItpromoDto) {
    const prisma = await this.getPrisma(tenant);
    const entries = this.buildEntries(dto);
    const updates = entries.map((entry) =>
      TenantPrisma.sql`${TenantPrisma.raw(`[${entry.column}]`)} = ${entry.value}`,
    );
    updates.push(TenantPrisma.raw('[UpdatedAt] = GETDATE()'));
    const output = this.buildOutputColumns('INSERTED');

    const records = await prisma.$queryRaw<TItpromoRecordDto[]>(
      TenantPrisma.sql`
        UPDATE T_ITPROMO
        SET ${TenantPrisma.join(updates)}
        OUTPUT ${TenantPrisma.join(output)}
        WHERE autocod = ${autocod}
      `,
    );

    const record = records[0];
    if (!record) {
      throw new NotFoundException(`T_ITPROMO ${autocod} nao encontrado.`);
    }

    return this.toRecordResponse(record);
  }

  async remove(tenant: string, autocod: number) {
    const prisma = await this.getPrisma(tenant);
    const output = this.buildOutputColumns('DELETED');

    const records = await prisma.$queryRaw<TItpromoRecordDto[]>(
      TenantPrisma.sql`
        DELETE FROM T_ITPROMO
        OUTPUT ${TenantPrisma.join(output)}
        WHERE autocod = ${autocod}
      `,
    );

    const record = records[0];
    if (!record) {
      throw new NotFoundException(`T_ITPROMO ${autocod} nao encontrado.`);
    }

    return this.toRecordResponse(record);
  }
}
