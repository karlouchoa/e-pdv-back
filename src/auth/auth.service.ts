import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantDbService } from '../tenant-db/tenant-db.service';

type TenantClient = Awaited<ReturnType<TenantDbService['getTenantClient']>>;

interface TenantUserLoginRow {
  cdusu: string | null;
  deusu: string | null;
  senha: string | null;
  adm: string | null;
  email: string | null;
}

@Injectable()
export class AuthService {
  private readonly expiresIn = process.env.JWT_EXPIRES_IN ?? '1h';

  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly jwtService: JwtService,
  ) {}

  private async findActiveTenantUserByEmail(
    prisma: TenantClient,
    email: string,
  ): Promise<TenantUserLoginRow | null> {
    const normalizedEmail = email?.trim();
    if (!normalizedEmail) {
      return null;
    }

    const users = await prisma.$queryRaw<TenantUserLoginRow[]>`
      SELECT TOP 1 cdusu, deusu, senha, adm, email
      FROM t_users
      WHERE ISNULL(isdeleted, 0) = 0
        AND ISNULL(ativo, 'N') = 'S'
        AND UPPER(LTRIM(RTRIM(email))) = UPPER(LTRIM(RTRIM(${normalizedEmail})))
      ORDER BY codigo DESC
    `;

    return users[0] ?? null;
  }

  async listUserCompanies(tenant: string, userCode: string) {
    const cdusu = userCode?.trim();
    if (!cdusu) {
      throw new BadRequestException('Usuario nao encontrado no token.');
    }

    const prisma = await this.tenantDbService.getTenantClient(tenant);

    const links = await prisma.t_usere.findMany({
      where: {
        codusu: cdusu,
        NOT: { isdeleted: true },
      },
      select: { codemp: true },
      distinct: ['codemp'],
    });

    let companyIds = links
      .map((link) => link.codemp)
      .filter((id): id is number => typeof id === 'number');

    if (!companyIds.length) {
      const rawLinks = await prisma.$queryRaw<{ codemp: number }[]>`
        SELECT DISTINCT codemp
        FROM t_usere
        WHERE ISNULL(isdeleted, 0) = 0
          AND UPPER(LTRIM(RTRIM(codusu))) = UPPER(LTRIM(RTRIM(${cdusu})))
      `;

      companyIds = rawLinks
        .map((link) => link.codemp)
        .filter((id): id is number => typeof id === 'number');
    }

    if (!companyIds.length) {
      return [];
    }

    return prisma.t_emp.findMany({
      where: {
        cdemp: { in: companyIds },
        OR: [{ isdeleted: false }, { isdeleted: null }],
      },
      select: {
        cdemp: true,
        deemp: true,
        apelido: true,
        fantemp: true,
        cnpjemp: true,
        ativaemp: true,
      },
      orderBy: { deemp: 'asc' },
    });
  }

  async login(login: string, senha: string) {
    const identifier = login?.trim();
    if (!identifier) {
      throw new BadRequestException('Login nao informado.');
    }

    const passwordInput = senha?.trim();
    if (!passwordInput) {
      throw new BadRequestException('Senha nao informada.');
    }

    const {
      slug: tenantSlug,
      logoUrl,
      companyName,
    } = await this.tenantDbService.getTenantMetadataByIdentifier(identifier);
    // Tenant database is always resolved from t_acessos.login -> t_acessos.banco.
    const resolvedTenant = tenantSlug;

    const prisma = await this.tenantDbService.getTenantClient(resolvedTenant);
    const user = await this.findActiveTenantUserByEmail(prisma, identifier);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const storedPassword = user.senha?.trim() ?? '';
    const plainMatches =
      storedPassword.length > 0 && storedPassword === passwordInput;

    let hashedMatches = false;
    if (!plainMatches && storedPassword.startsWith('$2')) {
      try {
        hashedMatches = await bcrypt.compare(passwordInput, storedPassword);
      } catch {
        hashedMatches = false;
      }
    }

    if (!plainMatches && !hashedMatches) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const userCode = user.cdusu?.trim() ?? '';
    if (!userCode) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const userName = user.deusu?.trim() ?? '';
    const userEmail = user.email?.trim() ?? null;
    const isAdmin = user.adm === 'S';

    const payload = {
      sub: userCode,
      name: userName,
      email: userEmail,
      admin: isAdmin,
      tenant: resolvedTenant,
      tenantSlug: resolvedTenant,
      banco: resolvedTenant,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      expiresIn: this.expiresIn,
      usuario: userCode,
      nome: userName,
      deusu: userName,
      admin: isAdmin,
      email: userEmail,
      empresa: companyName ?? resolvedTenant,
      tenant: resolvedTenant,
      banco: resolvedTenant,
      logoUrl,
      mensagem: 'Login efetuado com sucesso',
    };
  }
}
