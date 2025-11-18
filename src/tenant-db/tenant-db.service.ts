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
   * Cache de conexões Prisma por tenant
   */
  
  /*private connections = new Map<string, TenantClient>();*/
  private connections: Map<string, TenantClient> = new Map();


  /**
   * Conexão fixa com o banco principal (t_acessos, t_empresas, etc)
   */
  private readonly main: MainClient = new MainPrismaClient();

  /**
   * Monta dinamicamente a connection string de cada tenant
   * com base nas variáveis de ambiente.
   */
  private buildTenantConnectionString(dbName: string): string {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;

    if (!host || !port || !user || !pass) {
      throw new Error(
        'Variáveis de ambiente do SQL Server não foram definidas: DB_HOST, DB_PORT, DB_USER, DB_PASS.',
      );
    }

    return (
      `sqlserver://${host}:${port};` +
      `database=${dbName};` +
      `user=${user};` +
      `password=${pass};` +
      `encrypt=true;trustServerCertificate=true;`
    );
  }

  /**
   * Retorna metadados do tenant com base no login do usuário.
   */
  async getTenantMetadataByIdentifier(identifier: string): Promise<{
    slug: string;
    logoUrl: string | null;
    companyName: string | null;
  }> {
    const normalized = identifier?.trim();

    if (!normalized) {
      throw new Error('Login não informado.');
    }

    const tenant = await this.main.t_acessos.findFirst({
      where: {
        ativo: 'S',
        OR: [{ login: normalized }, { nome: normalized }],
      },
    });

    if (!tenant) {
      throw new Error(
        `Nenhum tenant correspondente ao login '${normalized}' encontrado.`,
      );
    }

    const slug = tenant.banco?.trim();
    const logoUrl = (tenant as any)?.logoUrl?.trim?.() || null;
    const companyName = (tenant as any)?.empresa?.trim?.() || null;

    if (!slug) {
      throw new Error(
        `Tenant encontrado, mas o campo 'banco' está vazio para '${normalized}'.`,
      );
    }

    return { slug, logoUrl, companyName };
  }

  /**
   * Retorna o PrismaClient do tenant para consultas no banco específico.
   */
  async getTenantClient(tenantSlug: string): Promise<TenantClient> {
    const tenant = await this.main.t_acessos.findFirst({
      where: { ativo: 'S', banco: tenantSlug },
    });

    if (!tenant) {
      throw new Error(
        `Tenant '${tenantSlug}' não encontrado ou inativo em t_acessos.`,
      );
    }

    const databaseName = tenant.banco?.trim();
    if (!databaseName) {
      throw new Error(
        `Tenant '${tenantSlug}' encontrado, mas o campo 'banco' estǭ vazio.`,
      );
    }

    const connectionString = this.buildTenantConnectionString(databaseName);

    // Usa cache para evitar múltiplas conexões
    if (!this.connections.has(connectionString)) {
      this.logger.log(`Criando nova conexão Prisma para tenant: ${tenantSlug}`);

      const client = new TenantPrismaClient({
        datasources: { db: { url: connectionString } },
      });

      this.connections.set(connectionString, client);
    }

    return this.connections.get(connectionString)!;
  }

  /**
   * Finaliza todas as conexões quando o módulo é desligado.
   */
 
  async onModuleDestroy() {
    this.logger.log('Desconectando Prisma (main + tenants)...');
  
    const disconnects = Array.from(this.connections.values()).map((client) =>
      client.$disconnect(),
    );
    await Promise.allSettled(disconnects);
    this.connections.clear();

    await this.main.$disconnect();
  }
  

}
