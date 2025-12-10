import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { login: string; senha: string }) {
    const identifier = body.login?.trim();
    const password = body.senha?.trim();

    if (!identifier) {
      throw new BadRequestException('Login nao foi informado.');
    }

    if (!password) {
      throw new BadRequestException('Senha nao foi informada.');
    }

    return this.authService.login(identifier, password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request & { user?: JwtPayload }) {
    return request.user;
  }

  @Get('companies_user')
  @UseGuards(JwtAuthGuard)
  async listCompaniesForUser(
    @Req() request: Request & { user?: JwtPayload },
  ) {
    const tenant = request.user?.tenant;
    if (!tenant) {
      throw new BadRequestException('Tenant nao encontrado no token.');
    }

    const userCode = request.user?.sub;
    if (!userCode) {
      throw new BadRequestException('Usuario nao encontrado no token.');
    }

    return this.authService.listUserCompanies(tenant, userCode);
  }
}
