import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { TenantJwtGuard } from './tenant-jwt.guard';
import type { JwtPayload } from './types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @UseGuards(TenantJwtGuard)
  me(@Req() request: Request & { user?: JwtPayload }) {
    return request.user;
  }

  @Get('companies_user')
  @UseGuards(TenantJwtGuard)
  async listCompaniesForUser(@Req() request: Request & { user?: JwtPayload }) {
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
