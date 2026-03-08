import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  TenantPrismaClient,
  type TenantClient,
  MainPrismaClient,
  type MainClient,
} from '../lib/prisma-clients';

@Injectable()
export class TenantDbService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDbService.name);

  /**
   * Prisma connection cache by tenant database URL.
   */
  private connections: Map<string, TenantClient> = new Map();
  private resolvedDatabaseByTenant: Map<string, string> = new Map();

  /**
   * Main database connection (t_acessos, etc).
   */
  private readonly main: MainClient;

  constructor() {
    const mainConnectionString = this.buildMainConnectionString();
    this.main = mainConnectionString
      ? new MainPrismaClient({
          datasources: { db: { url: mainConnectionString } },
        })
      : new MainPrismaClient();
  }

  private buildMainConnectionString(): string | null {
    const base =
      process.env.DATABASE_ACESSOS?.trim() || process.env.DATABASE_URL?.trim();

    if (!base) return null;
    return this.applyConnectionRuntimeOverrides(base);
  }

  /**
   * Build tenant connection string dynamically from environment variables.
   * Priority:
   * 1) TENANT_DATABASE_URL_TEMPLATE
   * 2) DATABASE_ACESSOS or DATABASE_URL (with database replaced by tenant slug)
   * 3) DATABASE_MODELO (with database replaced by tenant slug)
   * 4) DB_HOST/DB_PORT/DB_USER/DB_PASS fallback
   */
  private buildTenantConnectionString(dbName: string): string {
    const template = process.env.TENANT_DATABASE_URL_TEMPLATE?.trim();
    const acessosUrl =
      process.env.DATABASE_ACESSOS?.trim() || process.env.DATABASE_URL?.trim();
    const modelUrl = process.env.DATABASE_MODELO?.trim();

    let connectionString: string;

    if (template) {
      connectionString = this.applyTenantTemplate(template, dbName);
    } else if (acessosUrl) {
      connectionString = this.withDatabaseName(acessosUrl, dbName);
    } else if (modelUrl) {
      connectionString = this.withDatabaseName(modelUrl, dbName);
    } else {
      connectionString = this.buildTenantConnectionFromDbVars(dbName);
    }

    return this.applyConnectionRuntimeOverrides(connectionString);
  }

  private buildTenantConnectionFromDbVars(dbName: string): string {
    const host = process.env.DB_HOST?.trim();
    const port = process.env.DB_PORT?.trim() || '5432';
    const user = process.env.DB_USER?.trim();
    const pass = process.env.DB_PASS?.trim();

    if (!host || !user || !pass) {
      throw new Error(
        'PostgreSQL variables are missing: DB_HOST, DB_USER, DB_PASS.',
      );
    }

    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    const encodedDbName = encodeURIComponent(dbName);

    return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${encodedDbName}`;
  }

  /**
   * Replace placeholders in tenant template.
   */
  private applyTenantTemplate(template: string, dbName: string): string {
    const replaced = template
      .replace(/\{\{\s*(TENANT|DB_NAME)\s*\}\}/gi, dbName)
      .replace(/\$\{\s*(TENANT|DB_NAME)\s*\}/gi, dbName)
      .replace(/__(TENANT|DB_NAME)__/gi, dbName);

    if (replaced === template) {
      throw new Error(
        'TENANT_DATABASE_URL_TEMPLATE must contain one of: {{TENANT}}, ${TENANT}, __TENANT__, {{DB_NAME}}, ${DB_NAME}, __DB_NAME__.',
      );
    }

    return replaced;
  }

  /**
   * Replace database segment in a PostgreSQL URL.
   */
  private withDatabaseName(connectionString: string, dbName: string): string {
    try {
      const parsed = new URL(connectionString);
      if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
        return connectionString;
      }
      parsed.pathname = `/${encodeURIComponent(dbName)}`;
      return parsed.toString();
    } catch {
      const [base, query] = connectionString.split('?');
      const normalizedBase = base.replace(/\/[^/?#]*$/, '');
      const nextBase = `${normalizedBase}/${encodeURIComponent(dbName)}`;
      return query ? `${nextBase}?${query}` : nextBase;
    }
  }

  private describeConnectionEndpoint(connectionString: string): string {
    try {
      const parsed = new URL(connectionString);
      const host = parsed.hostname || 'unknown-host';
      const port = parsed.port || 'default-port';
      const database =
        decodeURIComponent(parsed.pathname.replace(/^\/+/, '')) || 'unknown-db';
      return `${host}:${port}/${database}`;
    } catch {
      return 'unknown-host:default-port/unknown-db';
    }
  }

  /**
   * Optional TLS overrides from DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE.
   */
  private applyConnectionRuntimeOverrides(connectionString: string): string {
    let next = this.applyHostPortOverrides(connectionString);
    next = this.applyTlsOverrides(next);
    next = this.applyPoolOverrides(next);
    return next;
  }

  private applyHostPortOverrides(connectionString: string): string {
    const host = process.env.DB_HOST?.trim();
    const port = process.env.DB_PORT?.trim();
    if (!host && !port) {
      return connectionString;
    }

    try {
      const parsed = new URL(connectionString);
      if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
        return connectionString;
      }

      if (host) parsed.hostname = host;
      if (port) parsed.port = port;
      return parsed.toString();
    } catch {
      return connectionString;
    }
  }

  private applyTlsOverrides(connectionString: string): string {
    let next = connectionString;

    const encrypt = this.readBooleanEnv('DB_ENCRYPT');
    const trustServerCertificate = this.readBooleanEnv(
      'DB_TRUST_SERVER_CERTIFICATE',
    );

    if (encrypt === false) {
      return this.upsertConnectionParam(next, 'sslmode', 'disable');
    }

    if (encrypt === true) {
      const sslMode = trustServerCertificate === false ? 'verify-full' : 'require';
      return this.upsertConnectionParam(next, 'sslmode', sslMode);
    }

    if (trustServerCertificate !== undefined) {
      const sslMode = trustServerCertificate ? 'require' : 'verify-full';
      next = this.upsertConnectionParam(next, 'sslmode', sslMode);
    }

    return next;
  }

  private applyPoolOverrides(connectionString: string): string {
    let next = connectionString;

    const connectionLimit = this.readIntegerEnv('DB_CONNECTION_LIMIT');
    if (connectionLimit !== undefined) {
      next = this.upsertConnectionParam(
        next,
        'connection_limit',
        String(connectionLimit),
      );
    }

    const poolTimeout = this.readIntegerEnv('DB_POOL_TIMEOUT');
    if (poolTimeout !== undefined) {
      next = this.upsertConnectionParam(next, 'pool_timeout', String(poolTimeout));
    }

    return next;
  }

  private upsertConnectionParam(
    connectionString: string,
    key: string,
    value: string,
  ): string {
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.set(key, value);
      return parsed.toString();
    } catch {
      const [base, query] = connectionString.split('?');
      const params = new URLSearchParams(query ?? '');
      params.set(key, value);
      const nextQuery = params.toString();
      return nextQuery ? `${base}?${nextQuery}` : base;
    }
  }

  private readBooleanEnv(name: string): boolean | undefined {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') {
      return undefined;
    }

    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }

    this.logger.warn(
      `Ignoring invalid boolean value for ${name}: "${raw}". Use true/false.`,
    );
    return undefined;
  }

  private readIntegerEnv(name: string): number | undefined {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') {
      return undefined;
    }

    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }

    this.logger.warn(
      `Ignoring invalid integer value for ${name}: "${raw}". Use a positive integer.`,
    );
    return undefined;
  }

  private async findActiveAccessByTenantKey(tenantKey: string): Promise<{
    banco: string;
    subdominio: string | null;
    companyName: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  } | null> {
    const normalizedKey = tenantKey?.trim();
    if (!normalizedKey) {
      return null;
    }

    const rows = await this.main.$queryRaw<
      Array<{
        banco: string | null;
        subdominio: string | null;
        empresa: string | null;
        logourl: string | null;
        imagem_capa: string | null;
      }>
    >`
      SELECT
        banco,
        subdominio,
        empresa,
        logourl,
        imagem_capa
      FROM t_acessos
      WHERE COALESCE(ativo, 'N') = 'S'
        AND (
          UPPER(TRIM(banco)) = UPPER(TRIM(${normalizedKey}))
          OR UPPER(TRIM(subdominio)) = UPPER(TRIM(${normalizedKey}))
        )
      ORDER BY
        CASE
          WHEN UPPER(TRIM(banco)) = UPPER(TRIM(${normalizedKey})) THEN 0
          WHEN UPPER(TRIM(subdominio)) = UPPER(TRIM(${normalizedKey})) THEN 1
          ELSE 2
        END,
        id DESC
      LIMIT 1
    `;

    const access = rows[0];
    if (!access) {
      return null;
    }

    const banco = access.banco?.trim();
    if (!banco) {
      return null;
    }

    return {
      banco,
      subdominio: access.subdominio?.trim() || null,
      companyName: access.empresa?.trim() || null,
      logoUrl: access.logourl?.trim() || null,
      coverUrl: access.imagem_capa?.trim() || null,
    };
  }

  private async findActiveAccessBySubdomain(subdomain: string): Promise<{
    banco: string;
    subdominio: string | null;
    companyName: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  } | null> {
    const normalizedSubdomain = subdomain?.trim();
    if (!normalizedSubdomain) {
      return null;
    }

    const rows = await this.main.$queryRaw<
      Array<{
        banco: string | null;
        subdominio: string | null;
        empresa: string | null;
        logourl: string | null;
        imagem_capa: string | null;
      }>
    >`
      SELECT
        banco,
        subdominio,
        empresa,
        logourl,
        imagem_capa
      FROM t_acessos
      WHERE COALESCE(ativo, 'N') = 'S'
        AND UPPER(TRIM(subdominio)) = UPPER(TRIM(${normalizedSubdomain}))
      ORDER BY id DESC
      LIMIT 1
    `;

    const access = rows[0];
    if (!access) {
      return null;
    }

    const banco = access.banco?.trim();
    if (!banco) {
      return null;
    }

    return {
      banco,
      subdominio: access.subdominio?.trim() || null,
      companyName: access.empresa?.trim() || null,
      logoUrl: access.logourl?.trim() || null,
      coverUrl: access.imagem_capa?.trim() || null,
    };
  }

  private buildDatabaseNameCandidates(
    databaseName: string,
    preferredDatabaseName?: string | null,
  ): string[] {
    const trimmed = databaseName.trim();
    const candidates: string[] = [];
    const pushUnique = (value: string) => {
      const normalized = value.trim();
      if (!normalized) return;
      if (!candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    if (preferredDatabaseName) {
      pushUnique(preferredDatabaseName);
    }
    pushUnique(trimmed);
    pushUnique(trimmed.toLowerCase());

    return candidates;
  }

  private isDatabaseNotFoundError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return /database .+ does not exist/i.test(message);
  }

  private async getOrCreateTenantClient(
    tenantLabel: string,
    databaseName: string,
  ): Promise<TenantClient> {
    const tenantCacheKey = tenantLabel.trim().toLowerCase();
    const preferredDatabaseName =
      this.resolvedDatabaseByTenant.get(tenantCacheKey) ?? null;
    const candidates = this.buildDatabaseNameCandidates(
      databaseName,
      preferredDatabaseName,
    );
    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidateDbName = candidates[index];
      const connectionString = this.buildTenantConnectionString(candidateDbName);

      // Reuse existing tenant connection when available.
      let client = this.connections.get(connectionString);
      if (!client) {
        this.logger.log(
          `Creating Prisma tenant connection for: ${tenantLabel} -> ${candidateDbName} at ${this.describeConnectionEndpoint(connectionString)}`,
        );

        client = new TenantPrismaClient({
          datasources: { db: { url: connectionString } },
        });

        this.connections.set(connectionString, client);
      }

      try {
        await client.$queryRawUnsafe('SELECT 1');
        if (index > 0) {
          this.logger.warn(
            `Tenant '${tenantLabel}' database fallback applied: '${databaseName}' -> '${candidateDbName}'.`,
          );
        }
        this.resolvedDatabaseByTenant.set(tenantCacheKey, candidateDbName);
        return client;
      } catch (error) {
        lastError = error;
        const isLastCandidate = index === candidates.length - 1;
        if (!this.isDatabaseNotFoundError(error) || isLastCandidate) {
          throw error;
        }

        this.connections.delete(connectionString);
        await client.$disconnect().catch(() => undefined);
        this.logger.warn(
          `Database '${candidateDbName}' not found for tenant '${tenantLabel}'. Trying next candidate...`,
        );
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(`Unable to create tenant client for '${tenantLabel}'.`);
  }

  async resolveTenantDatabaseName(tenantKey: string): Promise<string> {
    const access = await this.findActiveAccessByTenantKey(tenantKey);
    if (!access) {
      throw new Error(
        `Tenant '${tenantKey}' not found or inactive in t_acessos (banco/subdominio).`,
      );
    }

    return access.banco;
  }

  async resolveTenantDatabaseNameBySubdomain(
    subdomain: string,
  ): Promise<string> {
    const access = await this.findActiveAccessBySubdomain(subdomain);
    if (!access) {
      throw new Error(
        `Tenant '${subdomain}' not found or inactive in t_acessos (subdominio).`,
      );
    }

    return access.banco;
  }

  async getAccessProfileByTenantKey(tenantKey: string): Promise<{
    banco: string;
    subdominio: string | null;
    companyName: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  } | null> {
    return this.findActiveAccessByTenantKey(tenantKey);
  }

  async getAccessProfileBySubdomain(subdomain: string): Promise<{
    banco: string;
    subdominio: string | null;
    companyName: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  } | null> {
    return this.findActiveAccessBySubdomain(subdomain);
  }

  /**
   * Return tenant metadata based on e-mail/login in t_acessos.
   * Source of truth for tenant database is t_acessos.banco.
   */
  async getTenantMetadataByIdentifier(identifier: string): Promise<{
    slug: string;
    logoUrl: string | null;
    companyName: string | null;
  }> {
    const normalized = identifier?.trim();

    if (!normalized) {
      throw new Error('Login not provided.');
    }

    const rows = await this.main.$queryRaw<
      Array<{
        banco: string | null;
        logourl: string | null;
        empresa: string | null;
      }>
    >`
      SELECT banco, logourl, empresa
      FROM t_acessos
      WHERE COALESCE(ativo, 'N') = 'S'
        AND UPPER(TRIM(login)) = UPPER(TRIM(${normalized}))
      ORDER BY id DESC
      LIMIT 1
    `;

    const tenant = rows[0];
    if (!tenant) {
      throw new Error(`No tenant mapped to login '${normalized}'.`);
    }

    const slug = tenant.banco?.trim();
    const logoUrl = tenant.logourl?.trim() || null;
    const companyName = tenant.empresa?.trim() || null;

    if (!slug) {
      throw new Error(
        `Tenant found, but field "banco" is empty for '${normalized}'.`,
      );
    }

    return { slug, logoUrl, companyName };
  }

  /**
   * Return Prisma client for tenant-specific queries.
   */
  async getTenantClient(tenantSlug: string): Promise<TenantClient> {
    const tenant = await this.findActiveAccessByTenantKey(tenantSlug);
    if (!tenant) {
      throw new Error(
        `Tenant '${tenantSlug}' not found or inactive in t_acessos (banco/subdominio).`,
      );
    }

    return this.getOrCreateTenantClient(tenantSlug, tenant.banco);
  }

  async getTenantClientBySubdomain(subdomain: string): Promise<TenantClient> {
    const tenant = await this.findActiveAccessBySubdomain(subdomain);
    if (!tenant) {
      throw new Error(
        `Tenant '${subdomain}' not found or inactive in t_acessos (subdominio).`,
      );
    }

    return this.getOrCreateTenantClient(subdomain, tenant.banco);
  }

  getMainClient(): MainClient {
    return this.main;
  }

  /**
   * Close all Prisma connections when module shuts down.
   */
  async onModuleDestroy() {
    this.logger.log('Disconnecting Prisma (main + tenants)...');

    const disconnects = Array.from(this.connections.values()).map((client) =>
      client.$disconnect(),
    );
    await Promise.allSettled(disconnects);
    this.connections.clear();

    await this.main.$disconnect();
  }
}
