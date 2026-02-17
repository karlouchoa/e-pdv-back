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

const T_ITPROMO_PUBLIC_COLUMNS = [
  'EMPROMO',
  'CDITEM',
  'ID_ITEM',
  'DEITEM',
  'UNDVEN',
  'PRECO',
  'PRECOPROMO',
  'DATA_PROMO',
  'CDEMP',
  'PRECOMIN',
  'CUSTO',
];

@Injectable()
export class TItpromoService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private async getPublicPrismaBySubdomain(
    subdomain: string,
  ): Promise<TenantClient> {
    return this.tenantDbService.getTenantClientBySubdomain(subdomain);
  }

  private toPublicResponse(records: TItpromoPublicDto[]) {
    return records.map((record) => this.normalizePublicRecord(record));
  }

  private toRecordResponse(record: TItpromoRecordDto) {
    const normalized = this.normalizeRecord(record);
    return plainToInstance(TItpromoRecordDto, normalized, {
      excludeExtraneousValues: true,
    });
  }

  private normalizeRecord(record: TItpromoRecordDto) {
    const raw = record as unknown as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    T_ITPROMO_OUTPUT_COLUMNS.forEach((column) => {
      let value = raw[column];

      if (value === undefined) {
        value = null;
      }

      if (TenantPrisma.Decimal?.isDecimal?.(value)) {
        const numeric = Number(value);
        value = Number.isNaN(numeric) ? value.toString() : numeric;
      }

      output[column] = value;
    });

    return output as unknown as TItpromoRecordDto;
  }

  private normalizePublicRecord(record: TItpromoPublicDto) {
    const raw = record as unknown as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    T_ITPROMO_PUBLIC_COLUMNS.forEach((column) => {
      let value = raw[column];

      if (value === undefined) {
        value = null;
      }

      if (TenantPrisma.Decimal?.isDecimal?.(value)) {
        const numeric = Number(value);
        value = Number.isNaN(numeric) ? value.toString() : numeric;
      }

      output[column] = value;
    });

    return output as unknown as TItpromoPublicDto;
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

  private buildPromoMatchByKeys(keys: { cditem: number; empitem: number }) {
    return TenantPrisma.sql`
      T_ITPROMO.CDITEM = ${keys.cditem}
      AND T_ITPROMO.EMPITEM = ${keys.empitem}
    `;
  }

  private async resolvePromoKeys(
    tx: { $queryRaw: TenantClient['$queryRaw'] },
    dto: CreateTItpromoDto,
  ): Promise<{ cditem: number; empitem: number }> {
    let cditem = dto.cditem;
    let empitem = dto.empitem;

    if ((cditem === undefined || empitem === undefined) && dto.id_item) {
      const rows = await tx.$queryRaw<
        Array<{ cditem: number | null; cdemp: number | null }>
      >(
        TenantPrisma.sql`
          SELECT TOP (1)
            CDITEM AS cditem,
            CDEMP AS cdemp
          FROM T_ITENS
          WHERE ID = ${dto.id_item}
        `,
      );

      const found = rows[0];
      if (found) {
        if (cditem === undefined && found.cditem !== null) {
          cditem = found.cditem;
        }
        if (empitem === undefined && found.cdemp !== null) {
          empitem = found.cdemp;
        }
      }
    }

    if (cditem === undefined || empitem === undefined) {
      throw new BadRequestException(
        'Informe CDITEM e CDEMP (EMPITEM) ou um ID_ITEM valido.',
      );
    }

    return { cditem, empitem };
  }

  async findPublic(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    return this.findPublicWithPrisma(prisma);
  }

  async findPublicBySubdomain(subdomain: string) {
    const prisma = await this.getPublicPrismaBySubdomain(subdomain);
    return this.findPublicWithPrisma(prisma);
  }

  private async findPublicWithPrisma(prisma: TenantClient) {
    const records = await prisma.$queryRaw<TItpromoPublicDto[]>`
      SELECT
        T_ITPROMO.EMPROMO AS EMPROMO,
        T_ITENS.CDITEM AS CDITEM,
        T_ITPROMO.ID_ITEM AS ID_ITEM,
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
    const records = await this.createMany(tenant, [dto]);
    const record = records[0];
    if (!record) {
      throw new BadRequestException('Falha ao inserir em T_ITPROMO.');
    }
    return record;
  }

  async createMany(tenant: string, dtos: CreateTItpromoDto[]) {
    if (!dtos || dtos.length === 0) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const prisma = await this.getPrisma(tenant);
    const output = this.buildOutputColumns('INSERTED');
    const records = await prisma.$transaction(async (tx) => {
      const collected: TItpromoRecordDto[] = [];

      for (const dto of dtos) {
        const keys = await this.resolvePromoKeys(tx, dto);
        const insertDto: CreateTItpromoDto = {
          ...dto,
          cditem: keys.cditem,
          empitem: keys.empitem,
        };

        const updateEntries = this.buildEntries(dto);
        const insertEntries = this.buildEntries(insertDto);
        const columns = this.buildColumnList(
          insertEntries.map((entry) => entry.column),
        );
        const values = insertEntries.map((entry) => entry.value);
        const updates = updateEntries.map(
          (entry) =>
            TenantPrisma.sql`${TenantPrisma.raw(`[${entry.column}]`)} = ${entry.value}`,
        );
        updates.push(TenantPrisma.raw('[UpdatedAt] = GETDATE()'));

        if (!updates.length) {
          throw new BadRequestException('Informe ao menos um campo.');
        }

        const matchByKeys = this.buildPromoMatchByKeys(keys);

        const updated = await tx.$queryRaw<TItpromoRecordDto[]>(
          TenantPrisma.sql`
            UPDATE TOP (1) T_ITPROMO
            SET ${TenantPrisma.join(updates)}
            OUTPUT ${TenantPrisma.join(output)}
            WHERE ${matchByKeys}
              AND PRECOPROMO < PRECOMIN
              AND PRECOMIN < PRECO
              AND DATA_PROMO < GETDATE()
          `,
        );

        const updatedRecord = updated[0];
        if (updatedRecord) {
          collected.push(updatedRecord);
          continue;
        }

        const updatedFallback = await tx.$queryRaw<TItpromoRecordDto[]>(
          TenantPrisma.sql`
            UPDATE TOP (1) T_ITPROMO
            SET ${TenantPrisma.join(updates)}
            OUTPUT ${TenantPrisma.join(output)}
            WHERE ${matchByKeys}
          `,
        );

        const updatedFallbackRecord = updatedFallback[0];
        if (updatedFallbackRecord) {
          collected.push(updatedFallbackRecord);
          continue;
        }

        const inserted = await tx.$queryRaw<TItpromoRecordDto[]>(
          TenantPrisma.sql`
            INSERT INTO T_ITPROMO (${TenantPrisma.join(columns)})
            OUTPUT ${TenantPrisma.join(output)}
            VALUES (${TenantPrisma.join(values)})
          `,
        );

        const insertedRecord = inserted[0];
        if (!insertedRecord) {
          throw new BadRequestException('Falha ao inserir itens em T_ITPROMO.');
        }

        collected.push(insertedRecord);
      }

      return collected;
    });

    if (records.length !== dtos.length) {
      throw new BadRequestException('Falha ao inserir itens em T_ITPROMO.');
    }

    return records.map((record) => this.toRecordResponse(record));
  }

  async update(tenant: string, autocod: number, dto: UpdateTItpromoDto) {
    const prisma = await this.getPrisma(tenant);
    const entries = this.buildEntries(dto);
    const updates = entries.map(
      (entry) =>
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
