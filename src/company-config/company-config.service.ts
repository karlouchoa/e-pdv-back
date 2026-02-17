import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CompanyCepResponseDto } from './dto/company-cep-response.dto';
import { CompanyCnpjResponseDto } from './dto/company-cnpj-response.dto';
import { CreateStoreHourDto } from './dto/create-store-hour.dto';
import { StoreHoursQueryDto } from './dto/store-hours-query.dto';
import { StoreHourResponseDto } from './dto/store-hour-response.dto';
import { UpdateStoreHourDto } from './dto/update-store-hour.dto';

type AnyRecord = Record<string, unknown>;

type StoreHoursMetadata = {
  tableSchema: string;
  tableName: string;
  tableRef: string;
  columns: Map<string, string>;
  dataTypes: Map<string, string>;
};

type NormalizedStoreHourInput = {
  dayOfWeek?: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean;
  cdemp?: number;
  companyId?: string;
  companyCode?: string;
};

type ReplaceStoreHoursInput = {
  companyId?: string;
  companyCode?: string;
  cdemp?: number;
  rows: CreateStoreHourDto[];
};

const STORE_HOUR_TABLE_CANDIDATES = [
  'StoreHours',
  'store_hours',
  'storehours',
  'T_STOREHOURS',
];

const STORE_HOUR_ID_COLUMNS = [
  'ID',
  'Id',
  'id',
  'StoreHourId',
  'STOREHOURID',
  'autocod',
  'codigo',
];

const STORE_HOUR_DAY_COLUMNS = [
  'DayOfWeek',
  'dayOfWeek',
  'DAYOFWEEK',
  'day_of_week',
  'DAY_OF_WEEK',
  'day',
  'weekday',
  'diaSemana',
  'diasemana',
];

const STORE_HOUR_OPEN_COLUMNS = [
  'OpenTime',
  'openTime',
  'open_time',
  'OPEN_TIME',
  'openingTime',
  'abertura',
  'abre',
];

const STORE_HOUR_CLOSE_COLUMNS = [
  'CloseTime',
  'closeTime',
  'close_time',
  'CLOSE_TIME',
  'closingTime',
  'fechamento',
  'fecha',
];

const STORE_HOUR_CLOSED_COLUMNS = [
  'IsClosed',
  'isClosed',
  'is_closed',
  'IS_CLOSED',
  'closed',
  'fechado',
];

const STORE_HOUR_COMPANY_ID_COLUMNS = [
  'CompanyId',
  'companyId',
  'StoreId',
  'storeId',
  'store_id',
  'STORE_ID',
  'EmpresaId',
  'empresaId',
  'id_empresa',
  'ID_EMPRESA',
];

const STORE_HOUR_COMPANY_CODE_COLUMNS = [
  'CompanyCode',
  'companyCode',
  'StoreCode',
  'storeCode',
  'cdemp',
  'CDEMP',
  'EmpresaCodigo',
  'empresaCodigo',
];
const STORE_HOUR_CDEMP_COLUMNS = ['cdemp', 'CDEMP'];

const STORE_HOUR_CREATED_AT_COLUMNS = ['CreatedAt', 'createdAt', 'createdat'];
const STORE_HOUR_UPDATED_AT_COLUMNS = ['UpdatedAt', 'updatedAt', 'updatedat'];

const NUMERIC_TYPES = new Set([
  'tinyint',
  'smallint',
  'int',
  'bigint',
  'decimal',
  'numeric',
  'float',
  'real',
  'money',
  'smallmoney',
]);

@Injectable()
export class CompanyConfigService {
  private readonly storeHoursMetadataCache = new Map<
    string,
    StoreHoursMetadata
  >();

  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toRecord(value: unknown): AnyRecord {
    return (value ?? {}) as AnyRecord;
  }

  private getStringValue(record: AnyRecord, keys: string[], fallback = '') {
    for (const key of keys) {
      const value = record[key];
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return fallback;
  }

  private sanitizeDigits(value: string) {
    return (value ?? '').replace(/\D/g, '');
  }

  private formatCnpj(value: string) {
    const digits = this.sanitizeDigits(value).slice(0, 14);
    if (!digits) return '';
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  private formatCep(value: string) {
    const digits = this.sanitizeDigits(value).slice(0, 8);
    if (!digits) return '';
    return digits.replace(/(\d{5})(\d)/, '$1-$2');
  }

  private quoteIdentifier(value: string) {
    return `[${value.replace(/]/g, ']]')}]`;
  }

  private rawColumn(value: string) {
    return TenantPrisma.raw(this.quoteIdentifier(value));
  }

  private resolveColumn(metadata: StoreHoursMetadata, aliases: string[]) {
    for (const alias of aliases) {
      const column = metadata.columns.get(alias.toLowerCase());
      if (column) return column;
    }
    return null;
  }

  private buildTimeSelectClause(
    metadata: StoreHoursMetadata,
    column: string,
    alias: string,
  ) {
    const dataType = (metadata.dataTypes.get(column.toLowerCase()) ?? '')
      .toLowerCase()
      .trim();
    const aliasRef = TenantPrisma.raw(this.quoteIdentifier(alias));
    const columnRef = this.rawColumn(column);

    if (
      ['time', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset'].includes(
        dataType,
      )
    ) {
      // Normalize to HH:mm:ss to avoid timezone/date conversion side-effects.
      return TenantPrisma.sql`CONVERT(varchar(8), ${columnRef}, 108) AS ${aliasRef}`;
    }

    return TenantPrisma.sql`${columnRef} AS ${aliasRef}`;
  }

  private normalizeBoolean(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 's', 'sim', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'n', 'nao', 'no'].includes(normalized)) return false;
    return fallback;
  }

  private normalizeTimeInput(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const hhmm = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (hhmm) return `${hhmm[1]}:${hhmm[2]}:00`;
    const hhmmss = text.match(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
    if (hhmmss) return `${hhmmss[1]}:${hhmmss[2]}:${hhmmss[3]}`;
    throw new BadRequestException(
      'Horario invalido. Use o formato HH:mm ou HH:mm:ss.',
    );
  }

  private formatTimeOutput(value: unknown): string | null {
    if (value === undefined || value === null) return null;

    if (value instanceof Date) {
      const iso = value.toISOString();
      return iso.slice(11, 16);
    }

    const text = String(value).trim();
    if (!text) return null;

    const hhmmss = text.match(/([01]\d|2[0-3]):([0-5]\d):([0-5]\d)/);
    if (hhmmss) return `${hhmmss[1]}:${hhmmss[2]}`;

    const hhmm = text.match(/([01]\d|2[0-3]):([0-5]\d)/);
    if (hhmm) return `${hhmm[1]}:${hhmm[2]}`;

    return null;
  }

  private getFirstNumber(values: unknown[]): number | undefined {
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
  }

  private getFirstString(values: unknown[]): string | undefined {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return undefined;
  }

  private toSeconds(time: string): number {
    const [hours, minutes, seconds] = time.split(':').map((chunk) => Number(chunk));
    return hours * 3600 + minutes * 60 + seconds;
  }

  private validateTimeInterval(
    openTime: string | null | undefined,
    closeTime: string | null | undefined,
    options?: { requirePair?: boolean },
  ) {
    const hasOpen = openTime !== undefined && openTime !== null;
    const hasClose = closeTime !== undefined && closeTime !== null;

    if (options?.requirePair && hasOpen !== hasClose) {
      throw new BadRequestException(
        'Informe openTime e closeTime juntos para definir a faixa de horario.',
      );
    }

    if (hasOpen && hasClose && this.toSeconds(openTime!) >= this.toSeconds(closeTime!)) {
      throw new BadRequestException(
        'openTime deve ser menor que closeTime.',
      );
    }
  }

  private resolveCreateTimes(normalized: NormalizedStoreHourInput) {
    const isClosed = normalized.isClosed ?? false;
    const explicitOpen = normalized.openTime ?? undefined;
    const explicitClose = normalized.closeTime ?? undefined;

    if (explicitOpen !== undefined || explicitClose !== undefined) {
      this.validateTimeInterval(explicitOpen, explicitClose, { requirePair: true });
      return {
        isClosed,
        openTime: explicitOpen ?? null,
        closeTime: explicitClose ?? null,
      };
    }

    if (isClosed) {
      return {
        isClosed,
        openTime: null,
        closeTime: null,
      };
    }

    return {
      isClosed,
      openTime: '08:00:00',
      closeTime: '18:00:00',
    };
  }

  private normalizeStoreHourInput(
    dto: CreateStoreHourDto | UpdateStoreHourDto,
    requireDay: boolean,
  ): NormalizedStoreHourInput {
    const dayOfWeek = this.getFirstNumber([
      dto.dayOfWeek,
      dto.day,
      dto.weekday,
      dto.diaSemana,
    ]);

    if (
      requireDay &&
      (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)
    ) {
      throw new BadRequestException(
        'dayOfWeek deve ser um numero entre 0 e 6.',
      );
    }

    if (
      dayOfWeek !== undefined &&
      (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    ) {
      throw new BadRequestException(
        'dayOfWeek deve ser um numero entre 0 e 6.',
      );
    }

    const openTime = this.normalizeTimeInput(
      this.getFirstString([dto.openTime, dto.openingTime, dto.abertura]),
    );
    const closeTime = this.normalizeTimeInput(
      this.getFirstString([dto.closeTime, dto.closingTime, dto.fechamento]),
    );

    const hasClosedFlag =
      dto.isClosed !== undefined ||
      dto.closed !== undefined ||
      dto.fechado !== undefined;
    const isClosed = hasClosedFlag
      ? this.normalizeBoolean(dto.isClosed ?? dto.closed ?? dto.fechado, false)
      : undefined;

    const companyId = this.getFirstString([
      dto.companyId,
      dto.storeId,
      dto.empresaId,
      dto.id_empresa,
    ]);
    const companyCode = this.getFirstString([dto.companyCode, dto.storeCode]);
    const cdemp = this.getFirstNumber([dto.cdemp, companyCode]);

    return {
      dayOfWeek,
      openTime,
      closeTime,
      isClosed,
      cdemp,
      companyId,
      companyCode,
    };
  }

  private parseReplaceStoreHoursInput(
    payload: unknown,
  ): ReplaceStoreHoursInput | null {
    if (Array.isArray(payload)) {
      return { rows: payload as CreateStoreHourDto[] };
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = this.toRecord(payload);
    const rows = Array.isArray(record.hours)
      ? (record.hours as CreateStoreHourDto[])
      : Array.isArray(record.storeHours)
        ? (record.storeHours as CreateStoreHourDto[])
        : Array.isArray(record.faixas)
          ? (record.faixas as CreateStoreHourDto[])
          : Array.isArray(record.horarios)
            ? (record.horarios as CreateStoreHourDto[])
            : null;

    if (!rows) {
      return null;
    }

    const companyId = this.getFirstString([
      record.companyId,
      record.storeId,
      record.empresaId,
      record.id_empresa,
      record.ID_EMPRESA,
    ]);
    const companyCode = this.getFirstString([
      record.companyCode,
      record.storeCode,
    ]);
    const cdemp = this.getFirstNumber([record.cdemp, companyCode]);

    return {
      companyId,
      companyCode,
      cdemp,
      rows,
    };
  }

  private buildCompanyWhereParts(
    metadata: StoreHoursMetadata,
    select: ReturnType<CompanyConfigService['buildStoreHourSelectFields']>,
    filters: { companyId?: string; cdemp?: number; companyCode?: string },
    requireAtLeastOne: boolean,
  ) {
    const whereParts: any[] = [];
    const companyIdFilter = filters.companyId?.trim();

    if (companyIdFilter) {
      if (!select.companyIdColumn) {
        throw new BadRequestException(
          'Filtro por companyId nao disponivel nesta estrutura de tabela.',
        );
      }
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(select.companyIdColumn)} = ${this.castValueByColumnType(
          metadata,
          select.companyIdColumn,
          companyIdFilter,
        )}`,
      );
    }

    if (filters.cdemp !== undefined) {
      const targetColumn = select.cdempColumn ?? select.companyCodeColumn;
      if (!targetColumn) {
        throw new BadRequestException(
          'Filtro por cdemp nao disponivel nesta estrutura de tabela.',
        );
      }
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(targetColumn)} = ${this.castValueByColumnType(
          metadata,
          targetColumn,
          filters.cdemp,
        )}`,
      );
    } else {
      const companyCodeFilter = filters.companyCode?.trim();
      if (companyCodeFilter) {
        if (!select.companyCodeColumn) {
          throw new BadRequestException(
            'Filtro por companyCode nao disponivel nesta estrutura de tabela.',
          );
        }
        whereParts.push(
          TenantPrisma.sql`${this.rawColumn(select.companyCodeColumn)} = ${this.castValueByColumnType(
            metadata,
            select.companyCodeColumn,
            companyCodeFilter,
          )}`,
        );
      }
    }

    if (requireAtLeastOne && !whereParts.length) {
      throw new BadRequestException(
        'Informe companyId, cdemp ou companyCode para substituir StoreHours.',
      );
    }

    return whereParts;
  }

  private castValueByColumnType(
    metadata: StoreHoursMetadata,
    column: string,
    value: unknown,
  ) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const dataType = metadata.dataTypes.get(column.toLowerCase()) ?? '';
    const normalizedType = dataType.toLowerCase();

    if (normalizedType === 'bit') {
      return this.normalizeBoolean(value) ? 1 : 0;
    }

    if (NUMERIC_TYPES.has(normalizedType)) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException(`Valor invalido para coluna ${column}.`);
      }
      return parsed;
    }

    return value;
  }

  private mapStoreHourRow(row: AnyRecord): StoreHourResponseDto {
    const parsedDay =
      row.dayOfWeek === undefined || row.dayOfWeek === null
        ? Number.NaN
        : Number(row.dayOfWeek);
    const parsedCdemp =
      row.cdemp === undefined || row.cdemp === null
        ? Number.NaN
        : Number(row.cdemp);
    return {
      id: row.id === undefined || row.id === null ? null : String(row.id),
      dayOfWeek: Number.isFinite(parsedDay) ? parsedDay : null,
      openTime: this.formatTimeOutput(row.openTime),
      closeTime: this.formatTimeOutput(row.closeTime),
      isClosed: this.normalizeBoolean(row.isClosed, false),
      cdemp: Number.isFinite(parsedCdemp) ? parsedCdemp : null,
      companyId:
        row.companyId === undefined || row.companyId === null
          ? null
          : String(row.companyId),
      companyCode:
        row.companyCode === undefined || row.companyCode === null
          ? null
          : String(row.companyCode),
    };
  }

  private async resolveStoreHoursMetadata(
    tenant: string,
  ): Promise<StoreHoursMetadata> {
    const cached = this.storeHoursMetadataCache.get(tenant);
    if (cached) return cached;

    const prisma = await this.getPrisma(tenant);
    const tableRows = await prisma.$queryRaw<AnyRecord[]>(
      TenantPrisma.sql`
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
      `,
    );

    const byLowerName = new Map<string, AnyRecord>();
    tableRows.forEach((row) => {
      const tableName = this.getStringValue(this.toRecord(row), ['TABLE_NAME']);
      if (!tableName) return;
      byLowerName.set(tableName.toLowerCase(), this.toRecord(row));
    });

    const found = STORE_HOUR_TABLE_CANDIDATES.map((name) =>
      byLowerName.get(name.toLowerCase()),
    ).find(Boolean);

    if (!found) {
      throw new NotFoundException(
        'Tabela StoreHours nao encontrada para o tenant informado.',
      );
    }

    const tableSchema = this.getStringValue(found, ['TABLE_SCHEMA']);
    const tableName = this.getStringValue(found, ['TABLE_NAME']);

    const columnRows = await prisma.$queryRaw<AnyRecord[]>(
      TenantPrisma.sql`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ${tableSchema}
          AND TABLE_NAME = ${tableName}
      `,
    );

    if (!columnRows.length) {
      throw new NotFoundException(
        `Nao foi possivel carregar colunas de ${tableSchema}.${tableName}.`,
      );
    }

    const columns = new Map<string, string>();
    const dataTypes = new Map<string, string>();
    columnRows.forEach((row) => {
      const record = this.toRecord(row);
      const columnName = this.getStringValue(record, ['COLUMN_NAME']);
      const dataType = this.getStringValue(record, ['DATA_TYPE']);
      if (!columnName) return;
      columns.set(columnName.toLowerCase(), columnName);
      dataTypes.set(columnName.toLowerCase(), dataType);
    });

    const tableRef = `${this.quoteIdentifier(tableSchema)}.${this.quoteIdentifier(tableName)}`;
    const metadata: StoreHoursMetadata = {
      tableSchema,
      tableName,
      tableRef,
      columns,
      dataTypes,
    };

    this.storeHoursMetadataCache.set(tenant, metadata);
    return metadata;
  }

  private buildStoreHourSelectFields(metadata: StoreHoursMetadata) {
    const idColumn = this.resolveColumn(metadata, STORE_HOUR_ID_COLUMNS);
    const dayColumn = this.resolveColumn(metadata, STORE_HOUR_DAY_COLUMNS);
    const openColumn = this.resolveColumn(metadata, STORE_HOUR_OPEN_COLUMNS);
    const closeColumn = this.resolveColumn(metadata, STORE_HOUR_CLOSE_COLUMNS);
    const closedColumn = this.resolveColumn(
      metadata,
      STORE_HOUR_CLOSED_COLUMNS,
    );
    const companyIdColumn = this.resolveColumn(
      metadata,
      STORE_HOUR_COMPANY_ID_COLUMNS,
    );
    const companyCodeColumn = this.resolveColumn(
      metadata,
      STORE_HOUR_COMPANY_CODE_COLUMNS,
    );
    const cdempColumn = this.resolveColumn(metadata, STORE_HOUR_CDEMP_COLUMNS);

    if (!dayColumn) {
      throw new NotFoundException(
        `Tabela ${metadata.tableName} nao possui coluna de dia da semana.`,
      );
    }

    const fields = [
      idColumn
        ? TenantPrisma.sql`${this.rawColumn(idColumn)} AS [id]`
        : TenantPrisma.sql`NULL AS [id]`,
      TenantPrisma.sql`${this.rawColumn(dayColumn)} AS [dayOfWeek]`,
      openColumn
        ? this.buildTimeSelectClause(metadata, openColumn, 'openTime')
        : TenantPrisma.sql`NULL AS [openTime]`,
      closeColumn
        ? this.buildTimeSelectClause(metadata, closeColumn, 'closeTime')
        : TenantPrisma.sql`NULL AS [closeTime]`,
      closedColumn
        ? TenantPrisma.sql`${this.rawColumn(closedColumn)} AS [isClosed]`
        : TenantPrisma.sql`CAST(0 AS bit) AS [isClosed]`,
      companyIdColumn
        ? TenantPrisma.sql`${this.rawColumn(companyIdColumn)} AS [companyId]`
        : TenantPrisma.sql`NULL AS [companyId]`,
      companyCodeColumn
        ? TenantPrisma.sql`${this.rawColumn(companyCodeColumn)} AS [companyCode]`
        : TenantPrisma.sql`NULL AS [companyCode]`,
      cdempColumn
        ? TenantPrisma.sql`${this.rawColumn(cdempColumn)} AS [cdemp]`
        : TenantPrisma.sql`NULL AS [cdemp]`,
    ];

    return {
      fields,
      idColumn,
      dayColumn,
      openColumn,
      closeColumn,
      closedColumn,
      companyIdColumn,
      companyCodeColumn,
      cdempColumn,
      updatedAtColumn: this.resolveColumn(
        metadata,
        STORE_HOUR_UPDATED_AT_COLUMNS,
      ),
      createdAtColumn: this.resolveColumn(
        metadata,
        STORE_HOUR_CREATED_AT_COLUMNS,
      ),
    };
  }

  async listStoreHours(tenant: string, query: StoreHoursQueryDto) {
    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);

    const whereParts: any[] = [];

    const companyIdFilter = query.companyId?.trim();
    if (companyIdFilter) {
      if (!select.companyIdColumn) {
        throw new BadRequestException(
          'Filtro por companyId nao disponivel nesta estrutura de tabela.',
        );
      }
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(select.companyIdColumn)} = ${this.castValueByColumnType(
          metadata,
          select.companyIdColumn,
          companyIdFilter,
        )}`,
      );
    }

    if (query.cdemp !== undefined) {
      const targetColumn = select.cdempColumn ?? select.companyCodeColumn;
      if (!targetColumn) {
        throw new BadRequestException(
          'Filtro por cdemp nao disponivel nesta estrutura de tabela.',
        );
      }
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(targetColumn)} = ${this.castValueByColumnType(
          metadata,
          targetColumn,
          query.cdemp,
        )}`,
      );
    }

    const companyCodeFilter = query.companyCode?.trim();
    if (companyCodeFilter) {
      if (!select.companyCodeColumn) {
        throw new BadRequestException(
          'Filtro por companyCode nao disponivel nesta estrutura de tabela.',
        );
      }
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(select.companyCodeColumn)} = ${this.castValueByColumnType(
          metadata,
          select.companyCodeColumn,
          companyCodeFilter,
        )}`,
      );
    }

    if (query.dayOfWeek !== undefined) {
      whereParts.push(
        TenantPrisma.sql`${this.rawColumn(select.dayColumn)} = ${this.castValueByColumnType(
          metadata,
          select.dayColumn,
          query.dayOfWeek,
        )}`,
      );
    }

    const whereSql =
      whereParts.length > 0
        ? TenantPrisma.sql`WHERE ${TenantPrisma.join(whereParts, ' AND ')}`
        : TenantPrisma.sql``;

    const orderColumns = [this.rawColumn(select.dayColumn)];
    if (select.openColumn) {
      orderColumns.push(this.rawColumn(select.openColumn));
    }
    if (select.closeColumn) {
      orderColumns.push(this.rawColumn(select.closeColumn));
    }
    if (select.idColumn) {
      orderColumns.push(this.rawColumn(select.idColumn));
    }

    const rows = await prisma.$queryRaw<AnyRecord[]>(
      TenantPrisma.sql`
        SELECT ${TenantPrisma.join(select.fields, ', ')}
        FROM ${TenantPrisma.raw(metadata.tableRef)}
        ${whereSql}
        ORDER BY ${TenantPrisma.join(orderColumns, ', ')}
      `,
    );

    return rows.map((row) => this.mapStoreHourRow(this.toRecord(row)));
  }

  async findStoreHourById(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);

    if (!select.idColumn) {
      throw new NotFoundException(
        `Tabela ${metadata.tableName} nao possui coluna de identificador.`,
      );
    }

    const idValue = this.castValueByColumnType(metadata, select.idColumn, id);

    const rows = await prisma.$queryRaw<AnyRecord[]>(
      TenantPrisma.sql`
        SELECT ${TenantPrisma.join(select.fields, ', ')}
        FROM ${TenantPrisma.raw(metadata.tableRef)}
        WHERE ${this.rawColumn(select.idColumn)} = ${idValue}
      `,
    );

    const record = rows[0];
    if (!record) {
      throw new NotFoundException(`StoreHour ${id} nao encontrado.`);
    }

    return this.mapStoreHourRow(this.toRecord(record));
  }

  async createOrReplaceStoreHours(tenant: string, payload: unknown) {
    const replaceInput = this.parseReplaceStoreHoursInput(payload);
    if (!replaceInput) {
      return this.createStoreHour(tenant, payload as CreateStoreHourDto);
    }

    return this.replaceStoreHours(tenant, replaceInput);
  }

  private async replaceStoreHours(
    tenant: string,
    input: ReplaceStoreHoursInput,
  ) {
    if (!input.rows.length) {
      throw new BadRequestException(
        'Informe ao menos um horario para substituir StoreHours.',
      );
    }

    const rootCompanyId = input.companyId?.trim() || undefined;
    const rootCompanyCode = input.companyCode?.trim() || undefined;
    const rootCdemp =
      input.cdemp !== undefined
        ? input.cdemp
        : this.getFirstNumber([rootCompanyCode]);

    const normalizedWithRootDefaults = input.rows.map((row) => {
      const normalized = this.normalizeStoreHourInput(row, true);
      return {
        ...normalized,
        companyId: normalized.companyId ?? rootCompanyId,
        companyCode: normalized.companyCode ?? rootCompanyCode,
        cdemp:
          normalized.cdemp ??
          rootCdemp ??
          this.getFirstNumber([normalized.companyCode]),
      };
    });

    const firstWithCompanyData = normalizedWithRootDefaults.find(
      (row) =>
        row.companyId !== undefined ||
        row.cdemp !== undefined ||
        row.companyCode !== undefined,
    );

    const targetCompanyId = rootCompanyId ?? firstWithCompanyData?.companyId;
    const targetCdemp =
      rootCdemp ??
      firstWithCompanyData?.cdemp ??
      this.getFirstNumber([rootCompanyCode, firstWithCompanyData?.companyCode]);
    const targetCompanyCode =
      rootCompanyCode ??
      firstWithCompanyData?.companyCode ??
      (targetCdemp !== undefined ? String(targetCdemp) : undefined);

    const rowsWithCompanyDefaults = normalizedWithRootDefaults.map((row) => ({
      ...row,
      companyId: row.companyId ?? targetCompanyId,
      companyCode: row.companyCode ?? targetCompanyCode,
      cdemp:
        row.cdemp ??
        targetCdemp ??
        this.getFirstNumber([row.companyCode, targetCompanyCode]),
    }));

    const rowsToInsert = rowsWithCompanyDefaults
      .filter((row) => row.dayOfWeek !== undefined)
      .sort((a, b) => {
        const byDay = (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0);
        if (byDay !== 0) return byDay;

        const aOpen = a.openTime ?? '99:99:99';
        const bOpen = b.openTime ?? '99:99:99';
        if (aOpen !== bOpen) return aOpen.localeCompare(bOpen);

        const aClose = a.closeTime ?? '99:99:99';
        const bClose = b.closeTime ?? '99:99:99';
        if (aClose !== bClose) return aClose.localeCompare(bClose);

        return Number(a.isClosed ?? false) - Number(b.isClosed ?? false);
      });

    if (!rowsToInsert.length) {
      throw new BadRequestException(
        'Informe ao menos um horario valido para substituir StoreHours.',
      );
    }

    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);

    const whereParts = targetCompanyId
      ? this.buildCompanyWhereParts(
          metadata,
          select,
          {
            companyId: targetCompanyId,
          },
          true,
        )
      : this.buildCompanyWhereParts(
          metadata,
          select,
          {
            cdemp: targetCdemp,
            companyCode: targetCompanyCode,
          },
          true,
        );

    await prisma.$executeRaw(
      TenantPrisma.sql`
        DELETE FROM ${TenantPrisma.raw(metadata.tableRef)}
        WHERE ${TenantPrisma.join(whereParts, ' AND ')}
      `,
    );

    for (const row of rowsToInsert) {
      await this.createStoreHour(tenant, {
        dayOfWeek: row.dayOfWeek,
        openTime: row.openTime ?? undefined,
        closeTime: row.closeTime ?? undefined,
        isClosed: row.isClosed,
        companyId: row.companyId,
        companyCode: row.companyCode,
        cdemp: row.cdemp,
      });
    }

    const query: StoreHoursQueryDto = {};
    if (targetCompanyId) {
      query.companyId = targetCompanyId;
    }
    if (targetCdemp !== undefined) {
      query.cdemp = targetCdemp;
    } else if (targetCompanyCode) {
      query.companyCode = targetCompanyCode;
    }

    return this.listStoreHours(tenant, query);
  }

  async createStoreHour(tenant: string, dto: CreateStoreHourDto) {
    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);
    const normalized = this.normalizeStoreHourInput(dto, true);

    const { isClosed, openTime, closeTime } = this.resolveCreateTimes(normalized);

    const entries: Array<{ column: string; value: unknown; raw?: boolean }> =
      [];
    const pushEntry = (column: string | null, value: unknown, raw = false) => {
      if (!column || value === undefined) return;
      const index = entries.findIndex(
        (entry) => entry.column.toLowerCase() === column.toLowerCase(),
      );
      const next = { column, value, raw };
      if (index >= 0) {
        entries[index] = next;
      } else {
        entries.push(next);
      }
    };

    pushEntry(
      select.dayColumn,
      this.castValueByColumnType(
        metadata,
        select.dayColumn,
        normalized.dayOfWeek,
      ),
    );

    if (select.openColumn) {
      pushEntry(
        select.openColumn,
        this.castValueByColumnType(metadata, select.openColumn, openTime),
      );
    }
    if (select.closeColumn) {
      pushEntry(
        select.closeColumn,
        this.castValueByColumnType(metadata, select.closeColumn, closeTime),
      );
    }
    if (select.closedColumn) {
      pushEntry(
        select.closedColumn,
        this.castValueByColumnType(metadata, select.closedColumn, isClosed),
      );
    }
    const sharesCdempAndCompanyCodeColumn =
      !!select.cdempColumn &&
      !!select.companyCodeColumn &&
      select.cdempColumn.toLowerCase() ===
        select.companyCodeColumn.toLowerCase();

    if (select.companyIdColumn && normalized.companyId !== undefined) {
      pushEntry(
        select.companyIdColumn,
        this.castValueByColumnType(
          metadata,
          select.companyIdColumn,
          normalized.companyId,
        ),
      );
    }
    if (sharesCdempAndCompanyCodeColumn && select.cdempColumn) {
      const sharedValue =
        normalized.cdemp !== undefined
          ? normalized.cdemp
          : normalized.companyCode;
      if (sharedValue !== undefined) {
        pushEntry(
          select.cdempColumn,
          this.castValueByColumnType(metadata, select.cdempColumn, sharedValue),
        );
      }
    } else {
      if (select.cdempColumn && normalized.cdemp !== undefined) {
        pushEntry(
          select.cdempColumn,
          this.castValueByColumnType(
            metadata,
            select.cdempColumn,
            normalized.cdemp,
          ),
        );
      }

      if (select.companyCodeColumn) {
        const companyCodeValue =
          normalized.companyCode !== undefined
            ? normalized.companyCode
            : !select.cdempColumn
              ? normalized.cdemp
              : undefined;

        if (companyCodeValue !== undefined) {
          pushEntry(
            select.companyCodeColumn,
            this.castValueByColumnType(
              metadata,
              select.companyCodeColumn,
              companyCodeValue,
            ),
          );
        }
      }
    }
    if (select.createdAtColumn) {
      pushEntry(select.createdAtColumn, 'GETDATE()', true);
    }
    if (select.updatedAtColumn) {
      pushEntry(select.updatedAtColumn, 'GETDATE()', true);
    }

    const columnsSql = entries.map((entry) => this.rawColumn(entry.column));
    const valuesSql = entries.map((entry) =>
      entry.raw ? TenantPrisma.raw(String(entry.value)) : entry.value,
    );

    if (!columnsSql.length) {
      throw new BadRequestException(
        'Nenhum campo valido para inserir StoreHours.',
      );
    }

    if (select.idColumn) {
      const inserted = await prisma.$queryRaw<AnyRecord[]>(
        TenantPrisma.sql`
          INSERT INTO ${TenantPrisma.raw(metadata.tableRef)}
            (${TenantPrisma.join(columnsSql, ', ')})
          OUTPUT ${TenantPrisma.raw(`INSERTED.${this.quoteIdentifier(select.idColumn)}`)} AS [id]
          VALUES (${TenantPrisma.join(valuesSql, ', ')})
        `,
      );

      const idValue = inserted[0]?.id;
      if (idValue !== undefined && idValue !== null) {
        return this.findStoreHourById(tenant, String(idValue));
      }
    } else {
      await prisma.$executeRaw(
        TenantPrisma.sql`
          INSERT INTO ${TenantPrisma.raw(metadata.tableRef)}
            (${TenantPrisma.join(columnsSql, ', ')})
          VALUES (${TenantPrisma.join(valuesSql, ', ')})
        `,
      );
    }

    return {
      id: null,
      dayOfWeek: normalized.dayOfWeek ?? null,
      openTime: openTime ? this.formatTimeOutput(openTime) : null,
      closeTime: closeTime ? this.formatTimeOutput(closeTime) : null,
      isClosed,
      cdemp:
        normalized.cdemp ??
        this.getFirstNumber([normalized.companyCode]) ??
        null,
      companyId: normalized.companyId ?? null,
      companyCode: normalized.companyCode ?? null,
    } as StoreHourResponseDto;
  }

  async updateStoreHour(tenant: string, id: string, dto: UpdateStoreHourDto) {
    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);

    if (!select.idColumn) {
      throw new NotFoundException(
        `Tabela ${metadata.tableName} nao possui coluna de identificador.`,
      );
    }

    const normalized = this.normalizeStoreHourInput(dto, false);
    const setParts: Array<{ column: string; clause: any }> = [];

    const pushSet = (column: string | null, value: unknown, raw = false) => {
      if (!column || value === undefined) return;
      const nextClause = raw
        ? TenantPrisma.sql`${this.rawColumn(column)} = ${TenantPrisma.raw(String(value))}`
        : TenantPrisma.sql`${this.rawColumn(column)} = ${this.castValueByColumnType(metadata, column, value)}`;

      const index = setParts.findIndex(
        (entry) => entry.column.toLowerCase() === column.toLowerCase(),
      );
      if (index >= 0) {
        setParts[index] = { column, clause: nextClause };
      } else {
        setParts.push({ column, clause: nextClause });
      }
    };

    this.validateTimeInterval(normalized.openTime, normalized.closeTime);

    pushSet(select.dayColumn, normalized.dayOfWeek);
    pushSet(select.openColumn, normalized.openTime);
    pushSet(select.closeColumn, normalized.closeTime);
    pushSet(select.closedColumn, normalized.isClosed);
    pushSet(select.companyIdColumn, normalized.companyId);

    const sharesCdempAndCompanyCodeColumn =
      !!select.cdempColumn &&
      !!select.companyCodeColumn &&
      select.cdempColumn.toLowerCase() ===
        select.companyCodeColumn.toLowerCase();

    if (sharesCdempAndCompanyCodeColumn && select.cdempColumn) {
      const sharedValue =
        normalized.cdemp !== undefined
          ? normalized.cdemp
          : normalized.companyCode;
      pushSet(select.cdempColumn, sharedValue);
    } else {
      pushSet(select.cdempColumn, normalized.cdemp);
      const companyCodeValue =
        normalized.companyCode !== undefined
          ? normalized.companyCode
          : !select.cdempColumn
            ? normalized.cdemp
            : undefined;
      pushSet(select.companyCodeColumn, companyCodeValue);
    }

    if (normalized.isClosed === true) {
      if (select.openColumn && normalized.openTime === undefined) {
        pushSet(select.openColumn, null);
      }
      if (select.closeColumn && normalized.closeTime === undefined) {
        pushSet(select.closeColumn, null);
      }
    }

    if (select.updatedAtColumn) {
      pushSet(select.updatedAtColumn, 'GETDATE()', true);
    }

    if (!setParts.length) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar.',
      );
    }

    const idValue = this.castValueByColumnType(metadata, select.idColumn, id);
    const affected = await prisma.$executeRaw(
      TenantPrisma.sql`
        UPDATE ${TenantPrisma.raw(metadata.tableRef)}
        SET ${TenantPrisma.join(
          setParts.map((entry) => entry.clause),
          ', ',
        )}
        WHERE ${this.rawColumn(select.idColumn)} = ${idValue}
      `,
    );

    if (!affected) {
      throw new NotFoundException(`StoreHour ${id} nao encontrado.`);
    }

    return this.findStoreHourById(tenant, id);
  }

  async deleteStoreHour(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const metadata = await this.resolveStoreHoursMetadata(tenant);
    const select = this.buildStoreHourSelectFields(metadata);

    if (!select.idColumn) {
      throw new NotFoundException(
        `Tabela ${metadata.tableName} nao possui coluna de identificador.`,
      );
    }

    const idValue = this.castValueByColumnType(metadata, select.idColumn, id);
    const affected = await prisma.$executeRaw(
      TenantPrisma.sql`
        DELETE FROM ${TenantPrisma.raw(metadata.tableRef)}
        WHERE ${this.rawColumn(select.idColumn)} = ${idValue}
      `,
    );

    if (!affected) {
      throw new NotFoundException(`StoreHour ${id} nao encontrado.`);
    }

    return { deleted: true };
  }

  private async fetchJson(
    url: string,
    options?: {
      headers?: Record<string, string>;
      timeoutMs?: number;
    },
  ) {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 12000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(options?.headers ?? {}),
        },
        signal: controller.signal,
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as AnyRecord) : {};
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async geocodeAddress(
    addressChunks: Array<string | null | undefined>,
  ): Promise<{ latitude: string | null; longitude: string | null }> {
    const query = addressChunks
      .map((chunk) => chunk?.trim())
      .filter(Boolean)
      .join(', ');

    if (!query) {
      return { latitude: null, longitude: null };
    }

    try {
      const { response, data } = await this.fetchJson(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
          query,
        )}`,
        {
          headers: {
            'User-Agent': 'GoldPDVBackend/1.0',
          },
          timeoutMs: 8000,
        },
      );

      if (!response.ok || !Array.isArray(data)) {
        return { latitude: null, longitude: null };
      }

      const first = this.toRecord(data[0]);
      const latitude = this.getStringValue(first, ['lat']) || null;
      const longitude = this.getStringValue(first, ['lon']) || null;
      return { latitude, longitude };
    } catch {
      return { latitude: null, longitude: null };
    }
  }

  async lookupCnpj(rawCnpj: string): Promise<CompanyCnpjResponseDto> {
    const cnpjDigits = this.sanitizeDigits(rawCnpj);
    if (cnpjDigits.length !== 14) {
      throw new BadRequestException('Informe um CNPJ valido com 14 digitos.');
    }

    try {
      const { response, data } = await this.fetchJson(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`,
      );
      if (response.ok) {
        const inscriptions = Array.isArray(data.inscricoes_estaduais)
          ? (data.inscricoes_estaduais as AnyRecord[])
          : [];
        const firstIe =
          inscriptions.length > 0
            ? this.getStringValue(this.toRecord(inscriptions[0]), [
                'inscricao_estadual',
              ])
            : '';

        return {
          cnpj: this.formatCnpj(cnpjDigits),
          razaoSocial: this.getStringValue(data, ['razao_social']) || null,
          nomeFantasia: this.getStringValue(data, ['nome_fantasia']) || null,
          inscricaoEstadual:
            this.getStringValue(data, ['inscricao_estadual', 'ie']) ||
            firstIe ||
            null,
          endereco: this.getStringValue(data, ['logradouro']) || null,
          numero: this.getStringValue(data, ['numero']) || null,
          bairro: this.getStringValue(data, ['bairro']) || null,
          cidade: this.getStringValue(data, ['municipio', 'cidade']) || null,
          uf: this.getStringValue(data, ['uf']) || null,
          cep: this.formatCep(this.getStringValue(data, ['cep'])) || null,
          source: 'brasilapi',
        };
      }
    } catch {
      // fallback para ReceitaWS
    }

    try {
      const { response, data } = await this.fetchJson(
        `https://www.receitaws.com.br/v1/cnpj/${cnpjDigits}`,
      );
      if (!response.ok) {
        throw new NotFoundException('CNPJ nao encontrado.');
      }

      const status = this.getStringValue(data, ['status']).toLowerCase();
      if (status === 'error') {
        throw new NotFoundException('CNPJ nao encontrado.');
      }

      return {
        cnpj: this.formatCnpj(cnpjDigits),
        razaoSocial: this.getStringValue(data, ['nome']) || null,
        nomeFantasia: this.getStringValue(data, ['fantasia']) || null,
        inscricaoEstadual:
          this.getStringValue(data, ['inscricao_estadual']) || null,
        endereco: this.getStringValue(data, ['logradouro']) || null,
        numero: this.getStringValue(data, ['numero']) || null,
        bairro: this.getStringValue(data, ['bairro']) || null,
        cidade: this.getStringValue(data, ['municipio']) || null,
        uf: this.getStringValue(data, ['uf']) || null,
        cep: this.formatCep(this.getStringValue(data, ['cep'])) || null,
        source: 'receitaws',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Nao foi possivel consultar dados do CNPJ.');
    }
  }

  async lookupCep(rawCep: string): Promise<CompanyCepResponseDto> {
    const cepDigits = this.sanitizeDigits(rawCep);
    if (cepDigits.length !== 8) {
      throw new BadRequestException('Informe um CEP valido com 8 digitos.');
    }

    let street: string | null = null;
    let district: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let latitude: string | null = null;
    let longitude: string | null = null;
    let source = '';

    try {
      const { response, data } = await this.fetchJson(
        `https://brasilapi.com.br/api/cep/v2/${cepDigits}`,
      );

      if (response.ok) {
        const location = this.toRecord(data.location);
        const coordinates = this.toRecord(location.coordinates);

        street = this.getStringValue(data, ['street']) || null;
        district = this.getStringValue(data, ['neighborhood']) || null;
        city = this.getStringValue(data, ['city']) || null;
        state = this.getStringValue(data, ['state']) || null;
        latitude = this.getStringValue(coordinates, ['latitude']) || null;
        longitude = this.getStringValue(coordinates, ['longitude']) || null;
        source = 'brasilapi';
      }
    } catch {
      // fallback para ViaCEP
    }

    if (!street && !city) {
      try {
        const { response, data } = await this.fetchJson(
          `https://viacep.com.br/ws/${cepDigits}/json/`,
        );
        if (!response.ok || data.erro) {
          throw new NotFoundException('CEP nao encontrado.');
        }

        street = this.getStringValue(data, ['logradouro']) || null;
        district = this.getStringValue(data, ['bairro']) || null;
        city = this.getStringValue(data, ['localidade']) || null;
        state = this.getStringValue(data, ['uf']) || null;
        source = source || 'viacep';
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new NotFoundException('Nao foi possivel consultar dados do CEP.');
      }
    }

    if (!latitude || !longitude) {
      const geo = await this.geocodeAddress([
        street,
        district,
        city && state ? `${city} ${state}` : city,
        this.formatCep(cepDigits),
        'Brasil',
      ]);
      latitude = latitude || geo.latitude;
      longitude = longitude || geo.longitude;
      if (geo.latitude && geo.longitude) {
        source = source ? `${source}+nominatim` : 'nominatim';
      }
    }

    return {
      cep: this.formatCep(cepDigits),
      endereco: street,
      bairro: district,
      cidade: city,
      uf: state,
      latitude,
      longitude,
      source: source || 'cep',
    };
  }
}
