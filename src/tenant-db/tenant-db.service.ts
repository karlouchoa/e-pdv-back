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

  /**
   * Main database connection (t_acessos, etc).
   */
  private readonly main: MainClient = new MainPrismaClient();

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

    return this.applyTlsOverrides(connectionString);
  }

  private buildTenantConnectionFromDbVars(dbName: string): string {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;

    if (!host || !port || !user || !pass) {
      throw new Error(
        'SQL Server variables are missing: DB_HOST, DB_PORT, DB_USER, DB_PASS.',
      );
    }

    const encrypt = this.readBooleanEnv('DB_ENCRYPT') ?? true;
    const trustServerCertificate =
      this.readBooleanEnv('DB_TRUST_SERVER_CERTIFICATE') ?? true;

    return (
      `sqlserver://${host}:${port};` +
      `database=${dbName};` +
      `user=${user};` +
      `password=${pass};` +
      `encrypt=${encrypt};trustServerCertificate=${trustServerCertificate};`
    );
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
   * Replace "database=..." segment in a SQL Server URL.
   */
  private withDatabaseName(connectionString: string, dbName: string): string {
    const withTrailingSemicolon = connectionString.endsWith(';')
      ? connectionString
      : `${connectionString};`;

    const withoutDatabase = withTrailingSemicolon.replace(
      /database=[^;]*;?/gi,
      '',
    );

    return `${withoutDatabase}database=${dbName};`;
  }

  private describeConnectionEndpoint(connectionString: string): string {
    const hostMatch = connectionString.match(/^sqlserver:\/\/([^;:/?]+)(?::(\d+))?/i);
    const dbMatch = connectionString.match(/database=([^;]+)/i);
    const host = hostMatch?.[1] ?? 'unknown-host';
    const port = hostMatch?.[2] ?? 'default-port';
    const database = dbMatch?.[1] ?? 'unknown-db';
    return `${host}:${port}/${database}`;
  }

  /**
   * Optional TLS overrides from DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE.
   */
  private applyTlsOverrides(connectionString: string): string {
    let next = connectionString.endsWith(';')
      ? connectionString
      : `${connectionString};`;

    const encrypt = this.readBooleanEnv('DB_ENCRYPT');
    if (encrypt !== undefined) {
      next = this.upsertConnectionParam(next, 'encrypt', String(encrypt));
    }

    const trustServerCertificate = this.readBooleanEnv(
      'DB_TRUST_SERVER_CERTIFICATE',
    );
    if (trustServerCertificate !== undefined) {
      next = this.upsertConnectionParam(
        next,
        'trustServerCertificate',
        String(trustServerCertificate),
      );
    }

    return next;
  }

  private upsertConnectionParam(
    connectionString: string,
    key: string,
    value: string,
  ): string {
    const regex = new RegExp(`${key}=[^;]*;?`, 'i');
    if (regex.test(connectionString)) {
      return connectionString.replace(regex, `${key}=${value};`);
    }
    return `${connectionString}${key}=${value};`;
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
        logoUrl: string | null;
        Empresa: string | null;
      }>
    >`
      SELECT TOP 1 banco, logoUrl, Empresa
      FROM t_acessos
      WHERE ISNULL(ativo, 'N') = 'S'
        AND UPPER(LTRIM(RTRIM(login))) = UPPER(LTRIM(RTRIM(${normalized})))
      ORDER BY id DESC
    `;

    const tenant = rows[0];
    if (!tenant) {
      throw new Error(`No tenant mapped to login '${normalized}'.`);
    }

    const slug = tenant.banco?.trim();
    const logoUrl = tenant.logoUrl?.trim() || null;
    const companyName = tenant.Empresa?.trim() || null;

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
    const tenant = await this.main.t_acessos.findFirst({
      where: { ativo: 'S', banco: tenantSlug },
    });

    if (!tenant) {
      throw new Error(
        `Tenant '${tenantSlug}' not found or inactive in t_acessos.`,
      );
    }

    const databaseName = tenant.banco?.trim();
    if (!databaseName) {
      throw new Error(
        `Tenant '${tenantSlug}' found, but field "banco" is empty.`,
      );
    }

    const connectionString = this.buildTenantConnectionString(databaseName);

    // Reuse existing tenant connection when available.
    if (!this.connections.has(connectionString)) {
      this.logger.log(
        `Creating Prisma tenant connection for: ${tenantSlug} at ${this.describeConnectionEndpoint(connectionString)}`,
      );

      const client = new TenantPrismaClient({
        datasources: { db: { url: connectionString } },
      });

      this.connections.set(connectionString, client);
    }

    return this.connections.get(connectionString)!;
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
