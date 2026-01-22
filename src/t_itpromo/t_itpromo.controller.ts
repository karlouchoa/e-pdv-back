import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTItpromoDto } from './dto/create-t_itpromo.dto';
import { UpdateTItpromoDto } from './dto/update-t_itpromo.dto';
import { TItpromoService } from './t_itpromo.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itpromo')
@UseGuards(JwtAuthGuard)
export class TItpromoController {
  constructor(private readonly tItpromoService: TItpromoService) {}

  @Public()
  @Get()
  findPublic(@Req() req: Request) {
    const tenant = this.getTenantFromHost(req);
    return this.tItpromoService.findPublic(tenant);
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTItpromoDto) {
    return this.tItpromoService.create(req.user.tenant, dto);
  }

  @Patch(':autocod')
  update(
    @Req() req: TenantRequest,
    @Param('autocod', ParseIntPipe) autocod: number,
    @Body() dto: UpdateTItpromoDto,
  ) {
    return this.tItpromoService.update(req.user.tenant, autocod, dto);
  }

  @Delete(':autocod')
  remove(
    @Req() req: TenantRequest,
    @Param('autocod', ParseIntPipe) autocod: number,
  ) {
    return this.tItpromoService.remove(req.user.tenant, autocod);
  }

  private getTenantFromHost(req: Request) {
    const host = req.headers.host;
    const hostWithoutPort = host?.split(':')[0];
    const subdomain = hostWithoutPort?.split('.')[0];

    if (!subdomain || subdomain === 'www') {
      throw new NotFoundException('Estabelecimento nao identificado.');
    }

    return subdomain;
  }
}
