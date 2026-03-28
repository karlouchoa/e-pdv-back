import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  MainPrisma,
  type MainClient,
  MainPrismaClient,
  TenantPrisma,
  TenantPrismaClient,
} from '../lib/prisma-clients';
import {
  ProvisionTenantDto,
  ProvisionTenantResponseDto,
} from './dto/provision-tenant.dto';

type ProvisionRequestContext = {
  provisionKey?: string;
  correlationId?: string;
};

type NormalizedProvisionPayload = {
  empresa: {
    deemp: string;
    fantemp: string;
    apelido: string;
    cnpj: string;
    ieemp: string | null;
    endemp: string | null;
    numemp: string | null;
    baiemp: string | null;
    cidemp: string | null;
    estemp: string | null;
    cepemp: string | null;
    complemp: string | null;
    emailemp: string;
    wwwemp: string | null;
    dddemp: string;
    fonemp: string;
    logonfe: string | null;
    imagemCapa: string | null;
    taxaEntrega: number | null;
    caminhoCertificado: string | null;
    senhaCertificado: string | null;
    numeroSerieCertificado: string | null;
    cscId: number | null;
    cscToken: string | null;
    ultimaNfe: number | null;
    serieNfe: string | null;
    ultimaNfce: number | null;
    serieNfce: number | null;
    crt: string | null;
  };
  usuario: {
    loginEmail: string;
    senha: string;
    cdusu: string;
    deusu: string;
    email: string;
    adm: 'S' | 'N';
    ativo: 'S' | 'N';
  };
  acesso: {
    subdominio: string | null;
    funcao: string;
    whatsapp: string;
    ddd: string;
    nome: string;
    logoUrl: string | null;
    imagemCapa: string | null;
  };
  bancoBase: string;
  cnpjPrefix3: string;
};

type AccessQueryClient = {
  $queryRaw: (...args: any[]) => Promise<unknown>;
};

@Injectable()
export class PublicTenantProvisionService {
  private readonly logger = new Logger(PublicTenantProvisionService.name);

  constructor(private readonly configService: ConfigService) {}

  async provision(
    payload: ProvisionTenantDto,
    context: ProvisionRequestContext,
  ): Promise<ProvisionTenantResponseDto> {
    this.assertProvisionKey(context.provisionKey);

    const correlationId =
      this.normalizeText(context.correlationId, 100) ?? randomUUID();
    const normalized = this.normalizePayload(payload);
    const lockKey = normalized.empresa.cnpj;
    const lockClient = this.createMainSessionClient();

    let lockAcquired = false;
    let createdDatabase: string | null = null;

    this.logger.log(
      `[${correlationId}] Provisionamento iniciado para login=${normalized.usuario.loginEmail} cnpj=${normalized.empresa.cnpj}.`,
    );

    try {
      await lockClient.$connect();

      await this.acquireProvisionLock(lockClient, lockKey);
      lockAcquired = true;
      this.logger.log(`[${correlationId}] Lock de provisionamento adquirido.`);

      await this.assertLoginUniqueness(
        lockClient,
        normalized.usuario.loginEmail,
      );

      const databaseName = await this.resolveDatabaseName(
        lockClient,
        normalized.bancoBase,
        normalized.cnpjPrefix3,
      );
      const finalSubdomain = normalized.acesso.subdominio ?? databaseName;

      await this.assertSubdomainUniqueness(lockClient, finalSubdomain);

      this.logger.log(
        `[${correlationId}] Banco alvo resolvido: ${databaseName} | subdominio: ${finalSubdomain}.`,
      );

      await this.createTenantDatabase(lockClient, databaseName);
      createdDatabase = databaseName;
      this.logger.log(
        `[${correlationId}] Banco tenant criado com template goldpdv.`,
      );

      const { tenantUserPassword, acessoPassword } =
        await this.resolveStoredPasswords(normalized.usuario.senha);

      await this.seedTenantDatabase(
        databaseName,
        normalized,
        tenantUserPassword,
      );
      this.logger.log(`[${correlationId}] Dados tenant aplicados com sucesso.`);

      await this.insertAcessoRecord(
        lockClient,
        databaseName,
        finalSubdomain,
        normalized,
        acessoPassword,
      );
      this.logger.log(`[${correlationId}] Registro em t_acessos criado.`);

      return {
        banco: databaseName,
        subdominio: finalSubdomain,
        cnpj: normalized.empresa.cnpj,
        usuario: {
          cdusu: normalized.usuario.cdusu,
          email: normalized.usuario.email,
        },
        status: 'PROVISIONED',
        correlationId,
      };
    } catch (error) {
      if (createdDatabase) {
        try {
          await this.dropTenantDatabase(lockClient, createdDatabase);
          this.logger.warn(
            `[${correlationId}] Compensacao aplicada. Banco ${createdDatabase} removido.`,
          );
        } catch (dropError: any) {
          this.logger.error(
            `[${correlationId}] Falha ao compensar banco ${createdDatabase}: ${dropError?.message ?? dropError}`,
          );
        }
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : String(error ?? '');
      this.logger.error(
        `[${correlationId}] Falha no provisionamento: ${message}`,
      );
      throw new InternalServerErrorException(
        'Falha ao provisionar tenant. Verifique os dados e tente novamente.',
      );
    } finally {
      if (lockAcquired) {
        await this.releaseProvisionLock(lockClient, lockKey).catch(
          () => undefined,
        );
      }
      await lockClient.$disconnect().catch(() => undefined);
    }
  }

  protected createMainSessionClient() {
    const baseUrl = this.requireMainConnectionUrl();
    const url = this.upsertConnectionParam(baseUrl, 'connection_limit', '1');
    return new MainPrismaClient({
      datasources: { db: { url } },
    });
  }

  protected createTenantClient(databaseUrl: string) {
    return new TenantPrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
  }

  private assertProvisionKey(providedKey?: string) {
    const expectedKey = this.configService
      .get<string>('PROVISION_API_KEY')
      ?.trim();
    if (!expectedKey) {
      throw new InternalServerErrorException(
        'PROVISION_API_KEY nao configurada no ambiente.',
      );
    }

    const candidate = (providedKey ?? '').trim();
    if (!candidate || candidate !== expectedKey) {
      throw new ForbiddenException('x-provision-key invalida.');
    }
  }

  private async resolveStoredPasswords(rawPassword: string): Promise<{
    tenantUserPassword: string;
    acessoPassword: string;
  }> {
    const hashEnabled = this.isPasswordHashEnabled();
    const tenantUserPassword = hashEnabled
      ? await bcrypt.hash(rawPassword, 10)
      : rawPassword;

    return {
      tenantUserPassword,
      acessoPassword: rawPassword.slice(0, 15),
    };
  }

  private isPasswordHashEnabled(): boolean {
    const raw =
      this.configService.get<string>('PROVISION_HASH_PASSWORDS')?.trim() ?? '';
    const value = raw.toLowerCase();
    return (
      value === '1' || value === 'true' || value === 'yes' || value === 's'
    );
  }

  private normalizePayload(
    payload: ProvisionTenantDto,
  ): NormalizedProvisionPayload {
    const email = this.normalizeEmail(payload.email, 'email');
    const emailConfirm = payload.emailConfirmacao
      ? this.normalizeEmail(payload.emailConfirmacao, 'emailConfirmacao')
      : null;
    if (emailConfirm && emailConfirm !== email) {
      throw new BadRequestException('emailConfirmacao diferente de email.');
    }

    if (payload.confirmarSenha !== payload.senha) {
      throw new BadRequestException('confirmarSenha diferente de senha.');
    }

    const cnpj = this.normalizeCnpj(payload.cnpj);
    const cnpjPrefix3 = cnpj.slice(0, 3);
    const bancoBase = this.deriveDatabaseBaseName(payload.nomeFantasia);
    const taxaEntregaInput = payload.taxaEntrega;
    const taxaEntrega =
      taxaEntregaInput === undefined || taxaEntregaInput === null
        ? null
        : Number(taxaEntregaInput);

    if (taxaEntrega !== null && !Number.isFinite(taxaEntrega)) {
      throw new BadRequestException('taxaEntrega deve ser numerico.');
    }

    const ddd = this.normalizeDigits(payload.ddd ?? '', 2);
    const phoneSource = this.normalizeDigits(
      payload.contatoTelefone ?? payload.whatsapp ?? '',
      11,
    );
    const phoneDdd =
      ddd || (phoneSource.length >= 10 ? phoneSource.slice(0, 2) : '');
    const phoneWithoutDdd =
      phoneSource.length >= 10 ? phoneSource.slice(2) : phoneSource;
    const phoneNumber = phoneWithoutDdd.slice(0, 10);
    const whatsapp = this.normalizeDigits(payload.whatsapp ?? phoneSource, 11);
    const whatsappNumber =
      whatsapp.length >= 10 ? whatsapp.slice(-10) : whatsapp.slice(0, 10);
    const apelidoFallback = this.requireText(
      payload.nomeFantasia,
      'nomeFantasia',
      30,
    ).toUpperCase();
    const cscId = this.normalizeOptionalInt(payload.cscId);

    return {
      empresa: {
        deemp: this.requireText(payload.razaoSocial, 'razaoSocial', 60),
        fantemp: this.requireText(payload.nomeFantasia, 'nomeFantasia', 60),
        apelido: this.normalizeText(payload.apelido, 30) ?? apelidoFallback,
        cnpj,
        ieemp: this.normalizeText(payload.inscricaoEstadual, 15),
        endemp: this.normalizeText(payload.endereco, 60),
        numemp: this.normalizeText(payload.numero, 20),
        baiemp: this.normalizeText(payload.bairro, 30),
        cidemp: this.normalizeText(payload.cidade, 30),
        estemp: this.normalizeText(payload.uf, 2)?.toUpperCase() ?? null,
        cepemp: this.normalizeDigits(payload.cep ?? '', 11) || null,
        complemp: this.normalizeText(payload.complemento, 60),
        emailemp: email,
        wwwemp: this.normalizeText(payload.site, 50),
        dddemp: phoneDdd,
        fonemp: phoneNumber,
        logonfe: this.normalizeText(payload.logoUrl, 200),
        imagemCapa: this.normalizeText(payload.imagemCapaUrl, 200),
        taxaEntrega,
        caminhoCertificado: this.normalizeText(
          payload.certificadoCaminhoPfx,
          120,
        ),
        senhaCertificado: this.normalizeText(payload.certificadoSenha, 60),
        numeroSerieCertificado: this.normalizeText(
          payload.certificadoNumeroSerie,
          60,
        ),
        cscId,
        cscToken: this.normalizeText(payload.cscToken, 120),
        ultimaNfe: this.normalizeOptionalInt(payload.ultimaNfe),
        serieNfe:
          this.normalizeOptionalInt(payload.serieNfe)?.toString() ?? null,
        ultimaNfce: this.normalizeOptionalInt(payload.ultimaNfce),
        serieNfce: this.normalizeOptionalInt(payload.serieNfce),
        crt: this.normalizeText(payload.crt, 24),
      },
      usuario: {
        loginEmail: email,
        senha: this.requireText(payload.senha, 'senha', 100),
        cdusu: this.requireText(payload.usuarioLogin, 'usuarioLogin', 10),
        deusu: this.requireText(payload.usuarioNome, 'usuarioNome', 30),
        email,
        adm: this.normalizeFlag(payload.usuarioAdm ?? 'S', 'usuarioAdm'),
        ativo: this.normalizeFlag(payload.usuarioAtivo ?? 'S', 'usuarioAtivo'),
      },
      acesso: {
        subdominio: this.normalizeSubdomain(payload.subdominioPreferido),
        funcao: this.normalizeText(payload.funcaoAcesso, 30) ?? 'adm',
        whatsapp: whatsappNumber,
        ddd: phoneDdd,
        nome:
          this.normalizeText(payload.contatoNome, 30) ??
          this.requireText(payload.usuarioNome, 'usuarioNome', 30),
        logoUrl: this.normalizeText(payload.logoUrl, 250),
        imagemCapa: this.normalizeText(payload.imagemCapaUrl, 250),
      },
      bancoBase,
      cnpjPrefix3,
    };
  }

  private normalizeFlag(value: string, field: string): 'S' | 'N' {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    if (normalized !== 'S' && normalized !== 'N') {
      throw new BadRequestException(`${field} deve ser 'S' ou 'N'.`);
    }
    return normalized;
  }

  private normalizeCnpj(value: string): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new BadRequestException('CNPJ invalido. Informe 14 digitos.');
    }
    return digits;
  }

  private normalizeDigits(value: unknown, maxLength: number): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.slice(0, maxLength);
  }

  private normalizeOptionalInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) {
      throw new BadRequestException('Valor numerico invalido no payload.');
    }
    return Math.trunc(asNumber);
  }

  private requireText(value: string, field: string, maxLength: number): string {
    const text = this.normalizeText(value, maxLength);
    if (!text) {
      throw new BadRequestException(`${field} e obrigatorio.`);
    }
    return text;
  }

  private normalizeText(value: unknown, maxLength: number): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.slice(0, maxLength);
  }

  private normalizeEmail(value: string, field: string): string {
    const email = this.normalizeText(value, 120)?.toLowerCase();
    if (!email) {
      throw new BadRequestException(`${field} e obrigatorio.`);
    }
    return email;
  }

  private toSlugParts(value: string): string[] {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  private deriveDatabaseBaseName(fantasyName: string): string {
    const parts = this.toSlugParts(fantasyName);
    const first = parts[0] ?? '';
    const second = parts[1] ?? '';
    const candidate = `${first}${second}`.slice(0, 55);

    if (!candidate || !/^[a-z0-9]+$/.test(candidate)) {
      throw new BadRequestException(
        'Nao foi possivel derivar nome do banco a partir de nomeFantasia.',
      );
    }

    return candidate;
  }

  private normalizeSubdomain(value?: string): string | null {
    if (!value) return null;
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return normalized || null;
  }

  private requireMainConnectionUrl(): string {
    const url =
      process.env.DATABASE_ACESSOS?.trim() || process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new InternalServerErrorException(
        'DATABASE_ACESSOS nao configurada para provisionamento.',
      );
    }
    return url;
  }

  private buildTenantConnectionString(databaseName: string): string {
    const template =
      process.env.DATABASE_MODELO?.trim() ||
      process.env.DATABASE_ACESSOS?.trim() ||
      process.env.DATABASE_URL?.trim();

    if (!template) {
      throw new InternalServerErrorException(
        'DATABASE_MODELO nao configurada para provisionamento.',
      );
    }

    try {
      const parsed = new URL(template);
      parsed.pathname = `/${encodeURIComponent(databaseName)}`;
      return parsed.toString();
    } catch {
      const [base, query] = template.split('?');
      const normalizedBase = base.replace(/\/[^/?#]*$/, '');
      const target = `${normalizedBase}/${encodeURIComponent(databaseName)}`;
      return query ? `${target}?${query}` : target;
    }
  }

  private upsertConnectionParam(
    url: string,
    key: string,
    value: string,
  ): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set(key, value);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private quoteIdentifier(identifier: string): string {
    if (!/^[a-z0-9_]+$/.test(identifier)) {
      throw new BadRequestException(
        'Nome de banco invalido para provisionamento.',
      );
    }
    return `"${identifier}"`;
  }

  private async acquireProvisionLock(main: MainClient, key: string) {
    await main.$queryRaw(
      MainPrisma.sql`
        SELECT pg_advisory_lock(hashtext('tenant-provision:' || lower(${key})))
      `,
    );
  }

  private async releaseProvisionLock(main: MainClient, key: string) {
    await main.$queryRaw(
      MainPrisma.sql`
        SELECT pg_advisory_unlock(hashtext('tenant-provision:' || lower(${key})))
      `,
    );
  }

  private async assertLoginUniqueness(main: AccessQueryClient, login: string) {
    const exists = await this.acessoFieldExists(main, 'login', login);
    if (exists) {
      throw new ConflictException(
        `Ja existe tenant provisionado para login ${login}.`,
      );
    }
  }

  private async assertSubdomainUniqueness(
    main: AccessQueryClient,
    subdomain: string,
  ) {
    const exists = await this.acessoFieldExists(main, 'subdominio', subdomain);
    if (exists) {
      throw new ConflictException(`Subdominio ${subdomain} ja esta em uso.`);
    }
  }

  private async acessoFieldExists(
    main: AccessQueryClient,
    field: 'login' | 'subdominio' | 'banco',
    value: string,
  ): Promise<boolean> {
    const rows = (await main.$queryRaw(
      MainPrisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM t_acessos
          WHERE LOWER(TRIM(COALESCE(${MainPrisma.raw(field)}, ''))) = LOWER(TRIM(${value}))
        ) AS "exists"
      `,
    )) as Array<{ exists: boolean }>;

    return rows[0]?.exists === true;
  }

  private async databaseExists(
    main: MainClient,
    databaseName: string,
  ): Promise<boolean> {
    const rows = await main.$queryRaw<Array<{ exists: boolean }>>(
      MainPrisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_database
          WHERE LOWER(datname) = LOWER(${databaseName})
        ) AS "exists"
      `,
    );

    return rows[0]?.exists === true;
  }

  private async resolveDatabaseName(
    main: MainClient,
    baseName: string,
    cnpjPrefix3: string,
  ): Promise<string> {
    const baseExists = await this.databaseExists(main, baseName);
    if (!baseExists) {
      return baseName;
    }

    const fallbackCandidate = `${baseName}${cnpjPrefix3}`.slice(0, 63);
    const fallbackExists = await this.databaseExists(main, fallbackCandidate);
    if (fallbackExists) {
      throw new ConflictException(
        `Banco ${fallbackCandidate} ja existe. Nao foi possivel provisionar tenant para o CNPJ informado.`,
      );
    }

    return fallbackCandidate;
  }

  private async createTenantDatabase(
    main: MainClient,
    databaseName: string,
  ): Promise<void> {
    await main.$executeRawUnsafe(
      `CREATE DATABASE ${this.quoteIdentifier(databaseName)} TEMPLATE ${this.quoteIdentifier(
        'goldpdv',
      )}`,
    );
  }

  private async dropTenantDatabase(
    main: MainClient,
    databaseName: string,
  ): Promise<void> {
    const quoted = this.quoteIdentifier(databaseName);

    try {
      await main.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS ${quoted} WITH (FORCE)`,
      );
    } catch {
      await main.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${quoted}`);
    }
  }

  private async seedTenantDatabase(
    databaseName: string,
    payload: NormalizedProvisionPayload,
    userPassword: string,
  ): Promise<void> {
    const tenantUrl = this.buildTenantConnectionString(databaseName);
    const tenantClient = this.createTenantClient(tenantUrl);
    const now = new Date();

    try {
      await tenantClient.$transaction(
        async (tx) => {
          const empUpdated = await tx.t_emp.updateMany({
            where: { cdemp: 1 },
            data: {
              deemp: payload.empresa.deemp,
              fantemp: payload.empresa.fantemp,
              apelido: payload.empresa.apelido,
              cnpjemp: payload.empresa.cnpj,
              ieemp: payload.empresa.ieemp ?? undefined,
              endemp: payload.empresa.endemp ?? undefined,
              numemp: payload.empresa.numemp ?? undefined,
              baiemp: payload.empresa.baiemp ?? undefined,
              cidemp: payload.empresa.cidemp ?? undefined,
              estemp: payload.empresa.estemp ?? undefined,
              cepemp: payload.empresa.cepemp ?? undefined,
              complemp: payload.empresa.complemp ?? undefined,
              emailemp: payload.empresa.emailemp,
              wwwemp: payload.empresa.wwwemp ?? undefined,
              dddemp: payload.empresa.dddemp,
              fonemp: payload.empresa.fonemp,
              logonfe: payload.empresa.logonfe ?? undefined,
              imagem_capa: payload.empresa.imagemCapa ?? undefined,
              taxa_entrega: payload.empresa.taxaEntrega ?? undefined,
              caminhodocertificado:
                payload.empresa.caminhoCertificado ?? undefined,
              senhadocertificado: payload.empresa.senhaCertificado ?? undefined,
              certificado: payload.empresa.numeroSerieCertificado ?? undefined,
              idcsc: payload.empresa.cscId ?? undefined,
              nrtoken: payload.empresa.cscToken ?? undefined,
              ultnfemp: payload.empresa.ultimaNfe ?? undefined,
              serienfe: payload.empresa.serieNfe ?? undefined,
              ultnfc: payload.empresa.ultimaNfce ?? undefined,
              serienfc: payload.empresa.serieNfce ?? undefined,
              crt: payload.empresa.crt ?? undefined,
              updatedat: now,
            },
          });

          if (!empUpdated.count) {
            throw new ConflictException(
              'Nao foi possivel atualizar t_emp (cdemp=1) no banco tenant.',
            );
          }

          await tx.t_users.create({
            data: {
              cdusu: payload.usuario.cdusu,
              deusu: payload.usuario.deusu,
              senha: userPassword,
              adm: payload.usuario.adm,
              ativo: payload.usuario.ativo,
              email: payload.usuario.email,
              empcx: 1,
              cdven: 2,
              isdeleted: false,
              createdat: now,
              updatedat: now,
            },
          });

          const userCompanyLink = await tx.t_usere.findFirst({
            where: {
              codusu: payload.usuario.cdusu,
              codemp: 1,
            },
            select: { autocod: true },
          });

          if (userCompanyLink) {
            await tx.t_usere.update({
              where: { autocod: userCompanyLink.autocod },
              data: {
                isdeleted: false,
                updatedat: now,
              },
            });
          } else {
            await tx.t_usere.create({
              data: {
                codusu: payload.usuario.cdusu,
                codemp: 1,
                isdeleted: false,
                createdat: now,
                updatedat: now,
              },
            });
          }

          const vendeUpdated = await tx.t_vende.updateMany({
            where: {
              cdven: 2,
              cdemp: 1,
            },
            data: {
              deven: payload.usuario.deusu,
              email: payload.usuario.email,
              dddven: payload.empresa.dddemp,
              ramal: payload.empresa.fonemp,
              ativosn: 'S',
              isdeleted: false,
              updatedat: now,
            },
          });

          if (!vendeUpdated.count) {
            throw new ConflictException(
              'Nao foi possivel atualizar t_vende (cdven=2) no banco tenant.',
            );
          }
        },
        {
          isolationLevel: TenantPrisma.TransactionIsolationLevel.Serializable,
        },
      );
    } finally {
      await tenantClient.$disconnect().catch(() => undefined);
    }
  }

  private async insertAcessoRecord(
    main: MainClient,
    databaseName: string,
    subdomain: string,
    payload: NormalizedProvisionPayload,
    acessoPassword: string,
  ): Promise<void> {
    await main.$transaction(
      async (tx: any) => {
        await this.assertLoginUniqueness(
          tx as unknown as AccessQueryClient,
          payload.usuario.loginEmail,
        );
        await this.assertSubdomainUniqueness(
          tx as unknown as AccessQueryClient,
          subdomain,
        );

        await tx.t_acessos.create({
          data: {
            login: payload.usuario.loginEmail,
            senha: acessoPassword,
            nome: payload.acesso.nome,
            funcao: payload.acesso.funcao,
            banco: databaseName,
            adm: payload.usuario.adm,
            ativo: payload.usuario.ativo,
            con: 0,
            pwd: 'N',
            cnpj: payload.empresa.cnpj,
            ddd: payload.acesso.ddd,
            whatsapp: payload.acesso.whatsapp,
            empresa: payload.empresa.fantemp,
            logourl: payload.acesso.logoUrl ?? undefined,
            imagem_capa: payload.acesso.imagemCapa ?? undefined,
            subdominio: subdomain,
            createdat: new Date(),
          },
        });
      },
      {
        isolationLevel: MainPrisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
