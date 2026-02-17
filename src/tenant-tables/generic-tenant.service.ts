import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import type { PrismaClient as MainClient } from '../../prisma/generated/client_main';
import { MainPrisma, TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import type { PrimaryKeyType, TenantTableConfig } from './tenant-table.config';

interface WhereParams {
  [key: string]: string;
}

type CoordinateSyncPayload = {
  shouldSync: boolean;
  dto: Record<string, any>;
};

export type GenericTenantUserContext = {
  userEmail?: string | null;
  userIdentifier?: string | null;
};

const LATITUDE_ALIASES = [
  'latitude',
  'Latitude',
  'LATITUDE',
  'lat',
  'Lat',
  'LAT',
  'latitute',
  'Latitute',
  'LATITUTE',
];

const LONGITUDE_ALIASES = [
  'longitude',
  'Longitude',
  'LONGITUDE',
  'lng',
  'Lng',
  'LNG',
  'lon',
  'Lon',
  'LON',
  'longitute',
  'Longitute',
  'LONGITUTE',
];

@Injectable()
export class GenericTenantService {
  private readonly logger = new Logger(GenericTenantService.name);
  private readonly compoundKeyName: string;
  private readonly scalarFields: Set<string> | null;
  private readonly hasLocationColumnByTenant = new Map<string, boolean>();
  private readonly tableRefByTenant = new Map<string, string>();

  constructor(
    private readonly config: TenantTableConfig,
    private readonly tenantDbService: TenantDbService,
  ) {
    this.compoundKeyName = this.config.primaryKeys
      .map((key) => key.name)
      .join('_');
    this.scalarFields = this.resolveScalarFields();
  }

  private resolveScalarFields(): Set<string> | null {
    const enumName = `${this.config.name.charAt(0).toUpperCase()}${this.config.name.slice(1)}ScalarFieldEnum`;
    const scalarFieldEnum = (TenantPrisma as Record<string, unknown>)[enumName];

    if (!scalarFieldEnum || typeof scalarFieldEnum !== 'object') {
      return null;
    }

    return new Set(Object.keys(scalarFieldEnum as Record<string, string>));
  }

  private sanitizeDto(dto: Record<string, any>): Record<string, any> {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      return {};
    }

    if (!this.scalarFields) {
      return dto;
    }

    const scalarFields = this.scalarFields;
    const filteredEntries = Object.entries(dto).filter(([key]) =>
      scalarFields.has(key),
    );

    return Object.fromEntries(filteredEntries);
  }

  private quoteIdentifier(value: string): string {
    return `[${value.replace(/]/g, ']]')}]`;
  }

  private isCompanyTable(): boolean {
    return this.config.name.toLowerCase() === 't_emp';
  }

  private readAliasValue(
    source: Record<string, any>,
    aliases: string[],
  ): { found: boolean; value: unknown } {
    for (const key of aliases) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        return { found: true, value: source[key] };
      }
    }

    const nestedLocation =
      source.location && typeof source.location === 'object'
        ? (source.location as Record<string, any>)
        : null;

    if (nestedLocation) {
      for (const key of aliases) {
        if (Object.prototype.hasOwnProperty.call(nestedLocation, key)) {
          return { found: true, value: nestedLocation[key] };
        }
      }
    }

    return { found: false, value: undefined };
  }

  private normalizeCoordinate(
    value: unknown,
    fieldName: 'latitude' | 'longitude',
  ): number | null {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value === 'undefined') {
      return null;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : Number(this.stringifyScalar(value).trim().replace(',', '.'));

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        `Valor invalido para '${fieldName}' em '${this.config.name}'.`,
      );
    }

    if (fieldName === 'latitude' && (parsed < -90 || parsed > 90)) {
      throw new BadRequestException(
        `Latitude fora do intervalo permitido (-90..90).`,
      );
    }

    if (fieldName === 'longitude' && (parsed < -180 || parsed > 180)) {
      throw new BadRequestException(
        `Longitude fora do intervalo permitido (-180..180).`,
      );
    }

    return parsed;
  }

  private prepareDtoForPersistence(
    dto: Record<string, any>,
  ): CoordinateSyncPayload {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      return { shouldSync: false, dto: {} };
    }

    if (!this.isCompanyTable()) {
      return { shouldSync: false, dto };
    }

    const normalizedDto: Record<string, any> = { ...dto };

    const latitudeRaw = this.readAliasValue(normalizedDto, LATITUDE_ALIASES);
    const longitudeRaw = this.readAliasValue(normalizedDto, LONGITUDE_ALIASES);

    for (const key of [...LATITUDE_ALIASES, ...LONGITUDE_ALIASES, 'location']) {
      delete normalizedDto[key];
    }

    if (latitudeRaw.found) {
      normalizedDto.latitude = this.normalizeCoordinate(
        latitudeRaw.value,
        'latitude',
      );
    }

    if (longitudeRaw.found) {
      normalizedDto.longitude = this.normalizeCoordinate(
        longitudeRaw.value,
        'longitude',
      );
    }

    return {
      shouldSync: latitudeRaw.found || longitudeRaw.found,
      dto: normalizedDto,
    };
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || typeof value === 'undefined') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private stringifyScalar(value: unknown): string {
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    return '';
  }

  private normalizeText(value: unknown, maxLen = 255): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = this.stringifyScalar(value).trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLen);
  }

  private sanitizeDigits(value: unknown): string {
    return this.stringifyScalar(value).replace(/\D/g, '');
  }

  private extractCompanyCnpj(
    entity?: Record<string, any> | null,
  ): string | null {
    if (!entity) return null;
    const digits = this.sanitizeDigits(entity.cnpjemp);
    return digits.length ? digits : null;
  }

  private extractCompanyAlias(
    entity?: Record<string, any> | null,
  ): string | null {
    if (!entity) return null;
    return this.normalizeText(entity.apelido, 100);
  }

  private async findAcessoIdByCnpjAndAlias(
    main: MainClient,
    cnpjDigits: string,
    companyAlias: string,
  ): Promise<number | null> {
    const rows = await main.$queryRaw<Array<{ id: number }>>(
      MainPrisma.sql`
        SELECT TOP (1) id
        FROM t_acessos
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(cnpj, ''))), '.', ''), '/', ''), '-', ''), ' ', '') = ${cnpjDigits}
          AND LOWER(LTRIM(RTRIM(ISNULL(Empresa, '')))) = LOWER(LTRIM(RTRIM(${companyAlias})))
        ORDER BY CASE WHEN ativo = 'S' THEN 0 ELSE 1 END, id
      `,
    );

    return rows[0]?.id ?? null;
  }

  private async resolveAcessoId(
    main: MainClient,
    entity: Record<string, any> | null | undefined,
  ): Promise<number | null> {
    const companyCnpj = this.extractCompanyCnpj(entity);
    const companyAlias = this.extractCompanyAlias(entity);
    if (!companyCnpj || !companyAlias) return null;

    return this.findAcessoIdByCnpjAndAlias(main, companyCnpj, companyAlias);
  }

  private async syncCompanyAccessMedia(
    entity: Record<string, any> | null | undefined,
    userContext?: GenericTenantUserContext,
  ): Promise<void> {
    if (!this.isCompanyTable()) return;

    const main = this.tenantDbService.getMainClient();
    const acessoId = await this.resolveAcessoId(main, entity);
    if (acessoId === null) {
      const actor =
        this.normalizeText(userContext?.userEmail, 120) ??
        this.normalizeText(userContext?.userIdentifier, 120);
      this.logger.warn(
        `[${this.config.name}] t_acessos nao localizado para sincronizar logo/capa${
          actor ? ` (usuario=${actor})` : ''
        }.`,
      );
      return;
    }

    const logoUrl = this.normalizeText(entity?.logonfe, 1000);
    const imagemCapa = this.normalizeText(entity?.imagem_capa, 255);

    await main.t_acessos.update({
      where: { id: acessoId },
      data: {
        logoUrl,
        imagem_capa: imagemCapa,
      },
    });
  }

  private extractCdempFromWhere(where: Record<string, any>): number | null {
    if (!this.isCompanyTable()) return null;

    const direct = this.parseNumber(where.cdemp);
    if (direct !== null) return direct;

    if (
      where[this.compoundKeyName] &&
      typeof where[this.compoundKeyName] === 'object'
    ) {
      return this.parseNumber(where[this.compoundKeyName].cdemp);
    }

    return null;
  }

  private async hasLocationColumn(
    tenant: string,
    prisma: TenantClient,
  ): Promise<boolean> {
    const cached = this.hasLocationColumnByTenant.get(tenant);
    if (cached !== undefined) return cached;

    const rows = await prisma.$queryRaw<Array<{ hasLocation?: number }>>(
      TenantPrisma.sql`
        SELECT TOP (1) 1 AS hasLocation
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE LOWER(TABLE_NAME) = LOWER(${this.config.name})
          AND LOWER(COLUMN_NAME) = 'location'
      `,
    );

    const hasColumn = rows.length > 0;
    this.hasLocationColumnByTenant.set(tenant, hasColumn);
    return hasColumn;
  }

  private async resolveTableRef(tenant: string, prisma: TenantClient) {
    const cached = this.tableRefByTenant.get(tenant);
    if (cached) return cached;

    const rows = await prisma.$queryRaw<
      Array<{ TABLE_SCHEMA?: string; TABLE_NAME?: string }>
    >(
      TenantPrisma.sql`
        SELECT TOP (1) TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND LOWER(TABLE_NAME) = LOWER(${this.config.name})
        ORDER BY CASE WHEN TABLE_SCHEMA = 'dbo' THEN 0 ELSE 1 END, TABLE_SCHEMA
      `,
    );

    const table = rows[0];
    if (!table?.TABLE_SCHEMA || !table?.TABLE_NAME) {
      throw new NotFoundException(
        `Tabela '${this.config.name}' nao encontrada para sincronizar localizacao.`,
      );
    }

    const tableRef = `${this.quoteIdentifier(table.TABLE_SCHEMA)}.${this.quoteIdentifier(table.TABLE_NAME)}`;
    this.tableRefByTenant.set(tenant, tableRef);
    return tableRef;
  }

  private async syncCompanyLocation(
    tenant: string,
    prisma: TenantClient,
    delegate: any,
    where: Record<string, any>,
    entity?: Record<string, any> | null,
  ) {
    if (!this.isCompanyTable()) return;
    if (!(await this.hasLocationColumn(tenant, prisma))) return;

    const cdemp =
      this.extractCdempFromWhere(where) ?? this.parseNumber(entity?.cdemp);
    if (cdemp === null) return;

    const persisted =
      entity ??
      (await delegate.findUnique({
        where: { cdemp },
      }));

    if (!persisted) return;

    const latitude = this.parseNumber(persisted.latitude);
    const longitude = this.parseNumber(persisted.longitude);
    const tableRef = await this.resolveTableRef(tenant, prisma);

    await prisma.$executeRaw(
      TenantPrisma.sql`
        UPDATE ${TenantPrisma.raw(tableRef)}
        SET [location] = CASE
          WHEN ${latitude} IS NULL OR ${longitude} IS NULL THEN NULL
          ELSE geography::Point(${latitude}, ${longitude}, 4326)
        END
        WHERE [cdemp] = ${cdemp}
      `,
    );
  }

  private async syncCompanySideEffects(
    tenant: string,
    prisma: TenantClient,
    delegate: any,
    where: Record<string, any>,
    entity: Record<string, any> | null | undefined,
    userContext: GenericTenantUserContext | undefined,
    options: { syncLocation: boolean },
  ) {
    if (!this.isCompanyTable()) return;

    if (options.syncLocation) {
      await this.syncCompanyLocation(tenant, prisma, delegate, where, entity);
    }

    try {
      await this.syncCompanyAccessMedia(entity, userContext);
    } catch (error: any) {
      this.logger.warn(
        `[${this.config.name}] falha ao sincronizar logo/capa no t_acessos: ${error?.message ?? error}`,
      );
    }
  }

  private async getDelegate(tenant: string) {
    const prisma = await this.tenantDbService.getTenantClient(tenant);
    const delegate = (prisma as any)?.[this.config.name];

    if (!delegate) {
      throw new NotFoundException(
        `Delegate for model '${this.config.name}' not found in Prisma client.`,
      );
    }

    return { prisma, delegate };
  }

  private castParam(
    name: string,
    type: PrimaryKeyType,
    value?: string,
  ): string | number {
    if (value === undefined) {
      throw new BadRequestException(
        `Missing route parameter '${name}' for resource '${this.config.name}'.`,
      );
    }

    if (type === 'number') {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException(
          `Parameter '${name}' must be a number for resource '${this.config.name}'.`,
        );
      }
      return parsed;
    }

    return value;
  }

  private buildWhere(params: WhereParams) {
    const { primaryKeys } = this.config;

    if (!primaryKeys.length) {
      throw new BadRequestException(
        `Primary key configuration missing for resource '${this.config.name}'.`,
      );
    }

    if (primaryKeys.length === 1) {
      const key = primaryKeys[0];
      return {
        [key.name]: this.castParam(key.name, key.type, params[key.name]),
      };
    }

    const entries = primaryKeys.map((key) => [
      key.name,
      this.castParam(key.name, key.type, params[key.name]),
    ]);

    return {
      [this.compoundKeyName]: Object.fromEntries(entries),
    };
  }

  private async ensureExists(
    delegate: TenantClient[keyof TenantClient],
    where: Record<string, any>,
  ) {
    const entity = await (delegate as any).findUnique({ where });
    if (!entity) {
      throw new NotFoundException(
        `Registro não encontrado em '${this.config.name}'.`,
      );
    }
  }

  async create(
    tenant: string,
    dto: Record<string, any>,
    userContext?: GenericTenantUserContext,
  ) {
    const { prisma, delegate } = await this.getDelegate(tenant);
    const prepared = this.prepareDtoForPersistence(dto);
    const data = this.sanitizeDto(prepared.dto);

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        `Nenhum campo valido informado para '${this.config.name}'.`,
      );
    }

    const created = await delegate.create({ data });

    await this.syncCompanySideEffects(
      tenant,
      prisma,
      delegate,
      { cdemp: created?.cdemp },
      created,
      userContext,
      { syncLocation: prepared.shouldSync },
    );

    return created;
  }

  async findAll(tenant: string) {
    const { delegate } = await this.getDelegate(tenant);
    return delegate.findMany();
  }

  async findOne(tenant: string, params: WhereParams) {
    const { delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    const record = await delegate.findUnique({ where });

    if (!record) {
      throw new NotFoundException(
        `Registro não encontrado em '${this.config.name}'.`,
      );
    }

    return record;
  }

  async update(
    tenant: string,
    params: WhereParams,
    dto: Record<string, any>,
    userContext?: GenericTenantUserContext,
  ) {
    const { prisma, delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    const prepared = this.prepareDtoForPersistence(dto);
    const data = this.sanitizeDto(prepared.dto);

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        `Nenhum campo valido informado para '${this.config.name}'.`,
      );
    }

    await this.ensureExists(delegate, where);
    const updated = await delegate.update({ where, data });

    await this.syncCompanySideEffects(
      tenant,
      prisma,
      delegate,
      where,
      updated,
      userContext,
      { syncLocation: prepared.shouldSync },
    );

    return updated;
  }

  async remove(tenant: string, params: WhereParams) {
    const { delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    await this.ensureExists(delegate, where);
    return delegate.delete({ where });
  }
}
