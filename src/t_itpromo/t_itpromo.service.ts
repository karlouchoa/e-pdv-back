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
import {
  SyncTItpromoBatchItemDto,
  SyncTItpromoBatchResponseDto,
  SyncTItpromoBatchResultItemDto,
} from './dto/sync-t_itpromo-batch.dto';
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
  id_item: 'id_item',
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
  'createdat',
  'updatedat',
  'DATA_PROMO',
  'id_item',
];

const T_ITPROMO_PUBLIC_COLUMNS = [
  'EMPROMO',
  'CDITEM',
  'id_item',
  'DEITEM',
  'UNDVEN',
  'PRECO',
  'PRECOPROMO',
  'DATA_PROMO',
  'CDEMP',
  'PRECOMIN',
  'CUSTO',
];

const T_ITPROMO_SYNC_NUMERIC_FIELDS = [
  'empromo',
  'cdpromo',
  'cditem',
  'preco',
  'precomin',
  'precopromo',
  'meta',
  'empitem',
  'custo',
  'autocodext',
] as const;

const T_ITPROMO_SYNC_STRING_FIELDS = ['undven', 'hostname', 'ip'] as const;

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
    return columns.map((column) => TenantPrisma.raw(column));
  }

  private buildReturningColumns() {
    return T_ITPROMO_OUTPUT_COLUMNS.map((column) =>
      TenantPrisma.raw(`${this.toReturningSourceColumn(column)} AS "${column}"`),
    );
  }

  private toReturningSourceColumn(column: string): string {
    if (column === 'createdat') return 'createdat';
    if (column === 'updatedat') return 'updatedat';
    if (column === 'DATA_PROMO') return 'data_promo';
    if (column === 'id_item') return 'id_item';
    return column;
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
          SELECT
            CDITEM AS cditem,
            CDEMP AS cdemp
          FROM T_ITENS
          WHERE ID = ${dto.id_item}
          LIMIT 1
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
        'Informe CDITEM e CDEMP (EMPITEM) ou um id_item valido.',
      );
    }

    return { cditem, empitem };
  }

  private toSyncDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private extractExistingTimestamp(record: {
    updatedat?: Date | null;
    createdat?: Date | null;
  }): Date | null {
    return record.updatedat ?? record.createdat ?? null;
  }

  private buildSyncMutationData(payload: SyncTItpromoBatchItemDto) {
    const data: Record<string, unknown> = {};

    for (const field of T_ITPROMO_SYNC_NUMERIC_FIELDS) {
      const value = payload[field];
      if (value === undefined || value === null) continue;
      data[field] = value;
    }

    for (const field of T_ITPROMO_SYNC_STRING_FIELDS) {
      const value = payload[field];
      if (value === undefined) continue;
      data[field] = value;
    }

    if (payload.id_item !== undefined) {
      data.id_item = payload.id_item ? payload.id_item.trim() : null;
    }

    if (payload.DATA_PROMO !== undefined) {
      data.DATA_PROMO =
        payload.DATA_PROMO === null ? null : this.toSyncDate(payload.DATA_PROMO);
    }

    return data;
  }

  private async enrichKeysByItemId(
    prisma: TenantClient,
    payload: SyncTItpromoBatchItemDto,
    data: Record<string, unknown>,
  ) {
    const currentCditem = data.cditem;
    const currentEmpitem = data.empitem;
    const itemId = payload.id_item?.trim();
    const needsItemLookup =
      Boolean(itemId) &&
      (typeof currentCditem !== 'number' || typeof currentEmpitem !== 'number');

    if (!needsItemLookup) {
      return;
    }

    const item = await prisma.t_itens.findFirst({
      where: { id: itemId },
      select: { cditem: true, cdemp: true },
    });

    if (!item) {
      return;
    }

    if (typeof currentCditem !== 'number') {
      data.cditem = item.cditem;
    }
    if (typeof currentEmpitem !== 'number') {
      data.empitem = item.cdemp;
    }
  }

  private toSyncErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Erro inesperado ao sincronizar promocao.';
  }

  async syncBatchById(tenant: string, items: SyncTItpromoBatchItemDto[]) {
    if (!items.length) {
      throw new BadRequestException('Informe ao menos uma promocao.');
    }

    const prisma = await this.getPrisma(tenant);
    const results: SyncTItpromoBatchResultItemDto[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
      const promoId = item.id?.trim();
      if (!promoId) {
        errors += 1;
        results.push({
          id: '',
          action: 'ERROR',
          message: 'ID da promocao nao informado.',
        });
        continue;
      }

      try {
        const incomingCreatedAt = this.toSyncDate(item.createdat);
        const incomingUpdatedAt = this.toSyncDate(item.updatedat);
        const existing = await prisma.t_itpromo.findFirst({
          where: { id: promoId },
          select: {
            autocod: true,
            updatedat: true,
            createdat: true,
          },
        });

        if (existing) {
          if (!incomingUpdatedAt) {
            skipped += 1;
            results.push({
              id: promoId,
              action: 'SKIPPED',
              message: 'Registro existente sem updatedat no payload.',
            });
            continue;
          }

          const currentTs = this.extractExistingTimestamp(existing);
          if (currentTs && incomingUpdatedAt.getTime() <= currentTs.getTime()) {
            skipped += 1;
            results.push({
              id: promoId,
              action: 'SKIPPED',
              message:
                'updatedat do payload menor ou igual ao registro atual; sem alteracao.',
            });
            continue;
          }

          const data = this.buildSyncMutationData(item);
          await this.enrichKeysByItemId(prisma, item, data);
          data.updatedat = incomingUpdatedAt;

          await prisma.t_itpromo.update({
            where: { autocod: existing.autocod },
            data,
          });

          updated += 1;
          results.push({
            id: promoId,
            action: 'UPDATED',
            message: 'Promocao atualizada com sucesso.',
          });
          continue;
        }

        if (!incomingCreatedAt) {
          skipped += 1;
          results.push({
            id: promoId,
            action: 'SKIPPED',
            message: 'Promocao nova sem createdat no payload.',
          });
          continue;
        }

        const data = this.buildSyncMutationData(item);
        await this.enrichKeysByItemId(prisma, item, data);
        data.id = promoId;
        data.createdat = incomingCreatedAt;
        data.updatedat = incomingUpdatedAt ?? incomingCreatedAt;

        await prisma.t_itpromo.create({
          data,
        });

        inserted += 1;
        results.push({
          id: promoId,
          action: 'INSERTED',
          message: 'Promocao inserida com sucesso.',
        });
      } catch (error) {
        errors += 1;
        results.push({
          id: promoId,
          action: 'ERROR',
          message: this.toSyncErrorMessage(error),
        });
      }
    }

    return plainToInstance(
      SyncTItpromoBatchResponseDto,
      {
        total: items.length,
        inserted,
        updated,
        skipped,
        errors,
        results,
      },
      { excludeExtraneousValues: true },
    );
  }

  async findPublic(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    return this.findPublicWithPrisma(prisma);
  }

  async findByTenant(tenant: string) {
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
        T_ITPROMO.EMPROMO AS "EMPROMO",
        T_ITENS.CDITEM AS "CDITEM",
        T_ITPROMO.id_item AS "id_item",
        T_ITENS.DEITEM AS "DEITEM",
        T_ITENS.UNDVEN AS "UNDVEN",
        T_ITENS.PRECO AS "PRECO",
        T_ITPROMO.PRECOPROMO AS "PRECOPROMO",
        CASE
          WHEN T_ITPROMO.DATA_PROMO < CURRENT_DATE THEN NULL
          ELSE T_ITPROMO.DATA_PROMO
        END AS "DATA_PROMO",
        T_ITENS.CDEMP AS "CDEMP",
        T_ITENS.PRECOMIN AS "PRECOMIN",
        T_ITENS.CUSTO AS "CUSTO"
      FROM T_ITENS
      LEFT JOIN T_ITPROMO ON T_ITPROMO.id_item = T_ITENS.id
      WHERE T_ITPROMO.DATA_PROMO >= CURRENT_TIMESTAMP
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
    const output = this.buildReturningColumns();
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
            TenantPrisma.sql`${TenantPrisma.raw(entry.column)} = ${entry.value}`,
        );
        updates.push(TenantPrisma.raw('updatedat = CURRENT_TIMESTAMP'));

        if (!updates.length) {
          throw new BadRequestException('Informe ao menos um campo.');
        }

        const matchByKeys = this.buildPromoMatchByKeys(keys);

        const updated = await tx.$queryRaw<TItpromoRecordDto[]>(
          TenantPrisma.sql`
            UPDATE T_ITPROMO
            SET ${TenantPrisma.join(updates)}
            WHERE ctid IN (
              SELECT ctid
              FROM T_ITPROMO
              WHERE ${matchByKeys}
                AND PRECOPROMO < PRECOMIN
                AND PRECOMIN < PRECO
                AND DATA_PROMO < CURRENT_TIMESTAMP
              ORDER BY autocod DESC
              LIMIT 1
            )
            RETURNING ${TenantPrisma.join(output)}
          `,
        );

        const updatedRecord = updated[0];
        if (updatedRecord) {
          collected.push(updatedRecord);
          continue;
        }

        const updatedFallback = await tx.$queryRaw<TItpromoRecordDto[]>(
          TenantPrisma.sql`
            UPDATE T_ITPROMO
            SET ${TenantPrisma.join(updates)}
            WHERE ctid IN (
              SELECT ctid
              FROM T_ITPROMO
              WHERE ${matchByKeys}
              ORDER BY autocod DESC
              LIMIT 1
            )
            RETURNING ${TenantPrisma.join(output)}
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
            VALUES (${TenantPrisma.join(values)})
            RETURNING ${TenantPrisma.join(output)}
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
        TenantPrisma.sql`${TenantPrisma.raw(entry.column)} = ${entry.value}`,
    );
    updates.push(TenantPrisma.raw('updatedat = CURRENT_TIMESTAMP'));
    const output = this.buildReturningColumns();

    const records = await prisma.$queryRaw<TItpromoRecordDto[]>(
      TenantPrisma.sql`
        UPDATE T_ITPROMO
        SET ${TenantPrisma.join(updates)}
        WHERE autocod = ${autocod}
        RETURNING ${TenantPrisma.join(output)}
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
    const output = this.buildReturningColumns();

    const records = await prisma.$queryRaw<TItpromoRecordDto[]>(
      TenantPrisma.sql`
        DELETE FROM T_ITPROMO
        WHERE autocod = ${autocod}
        RETURNING ${TenantPrisma.join(output)}
      `,
    );

    const record = records[0];
    if (!record) {
      throw new NotFoundException(`T_ITPROMO ${autocod} nao encontrado.`);
    }

    return this.toRecordResponse(record);
  }
}
