import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { PrismaClient as MainClient } from '../../prisma/generated/client_main';

@Injectable()
export class TenantDbService implements OnModuleDestroy {
  private connections = new Map<string, TenantClient>();
  private main = new MainClient();

  /**
   * Identifica o tenant (campo banco) a partir do login informado na tela,
   * comparando com as colunas login (email) ou nome da tabela t_acessos.
   * Retorna tambem metadados complementares, como o logoUrl.
   */
  async getTenantMetadataByIdentifier(
    identifier: string,
  ): Promise<{ slug: string; logoUrl: string | null; companyName: string | null }> {
    const normalized = identifier?.trim();

    if (!normalized) {
      throw new Error('Login nao informado.');
    }

    const tenant = await this.main.t_acessos.findFirst({
      where: {
        ativo: 'S',
        OR: [{ login: normalized }, { nome: normalized }],
      },
    });

    const slug = tenant?.banco?.trim();
    const logoRaw =
      (tenant as { logoUrl?: string | null } | null)?.logoUrl ?? null;
    const logoUrl = logoRaw?.trim() ?? null;
    const companyRaw =
      (tenant as { empresa?: string | null } | null)?.empresa ?? null;
    const companyName = companyRaw?.trim() ?? null;

    if (!slug) {
      throw new Error(
        `Tenant nao encontrado para o login '${normalized}' em t_acessos.`,
      );
    }

    return { slug, logoUrl, companyName };
  }

  async getTenantClient(tenantSlug: string): Promise<TenantClient> {
    // Busca o tenant no banco "acessos" usando o subdominio (campo banco)
    const tenant = await this.main.t_acessos.findFirst({
      where: { ativo: 'S', banco: tenantSlug },
    });

    if (!tenant) {
      throw new Error(
        `Tenant '${tenantSlug}' nao encontrado ou inativo em t_acessos.`,
      );
    }

    // Monta a connection string dinamica
    const connectionString = `sqlserver://103.199.184.26:15453;database=${tenant.banco};user=srmobile;password=P90pO89o;encrypt=true;trustServerCertificate=true;`;

    // Cache da conexao
    if (!this.connections.has(connectionString)) {
      const client = new TenantClient({
        datasources: { db: { url: connectionString } },
      });
      this.connections.set(connectionString, client);
    }

    return this.connections.get(connectionString)!;
  }

  async onModuleDestroy() {
    for (const client of this.connections.values()) {
      await client.$disconnect();
    }
    await this.main.$disconnect();
  }
}
