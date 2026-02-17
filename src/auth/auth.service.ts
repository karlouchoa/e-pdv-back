import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantDbService } from '../tenant-db/tenant-db.service';

@Injectable()
export class AuthService {
  private readonly expiresIn = process.env.JWT_EXPIRES_IN ?? '1h';

  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly jwtService: JwtService,
  ) {}

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

  async login(login: string, senha: string, _requestTenant?: string | null) {
    const identifier = login?.trim();
    if (!identifier) {
      throw new Error('Login nao informado.');
    }

    const {
      slug: tenantSlug,
      logoUrl,
      companyName,
    } = await this.tenantDbService.getTenantMetadataByIdentifier(identifier);
    // Tenant database is always resolved from t_acessos.login -> t_acessos.banco.
    const resolvedTenant = tenantSlug;

    const prisma = await this.tenantDbService.getTenantClient(resolvedTenant);
    const passwordInput = senha?.trim() ?? '';

    const user = await prisma.t_users.findFirst({
      where: {
        ativo: 'S',
        OR: [{ email: identifier }, { cdusu: identifier }],
      },
    });

    if (!user) {
      throw new Error('Usuario nao encontrado ou inativo.');
    }

    const storedPassword = user.senha?.trim() ?? '';
    const plainMatches =
      storedPassword.length > 0 &&
      storedPassword.toLowerCase() === passwordInput.toLowerCase();

    let hashedMatches = false;
    if (!plainMatches && storedPassword.startsWith('$2')) {
      try {
        hashedMatches = await bcrypt.compare(passwordInput, storedPassword);
      } catch {
        hashedMatches = false;
      }
    }

    if (!plainMatches && !hashedMatches) {
      throw new Error('Senha incorreta.');
    }

    const userCode = user.cdusu?.trim() ?? '';
    const userName = user.deusu?.trim() ?? '';
    const userEmail = user.email?.trim() ?? null;
    const isAdmin = user.adm === 'S';

    const payload = {
      sub: userCode,
      name: userName,
      email: userEmail,
      admin: isAdmin,
      tenant: resolvedTenant,
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
      logoUrl,
      mensagem: 'Login efetuado com sucesso',
    };
  }
}
