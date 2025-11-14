import { Injectable } from '@nestjs/common';
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

  async login(login: string, senha: string) {
    const identifier = login?.trim();
    if (!identifier) {
      throw new Error('Login nao informado.');
    }

    const { slug: tenantSlug, logoUrl, companyName } =
      await this.tenantDbService.getTenantMetadataByIdentifier(identifier);

    const prisma = await this.tenantDbService.getTenantClient(tenantSlug);
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
      tenant: tenantSlug,
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
      empresa: companyName ?? tenantSlug,
      tenant: tenantSlug,
      logoUrl,
      mensagem: 'Login efetuado com sucesso',
    };
  }
}
