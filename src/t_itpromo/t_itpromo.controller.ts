import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { resolvePublicSubdomainFromRequest } from '../public/tenant-resolver';
import { CreateTItpromoBatchDto } from './dto/create-t_itpromo-batch.dto';
import { CreateTItpromoDto } from './dto/create-t_itpromo.dto';
import { UpdateTItpromoDto } from './dto/update-t_itpromo.dto';
import { TItpromoService } from './t_itpromo.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itpromo')
@UseGuards(TenantJwtGuard)
export class TItpromoController {
  constructor(private readonly tItpromoService: TItpromoService) {}

  @Public()
  @Get()
  findPublic(@Req() req: Request) {
    const subdomain = resolvePublicSubdomainFromRequest(req);
    return this.tItpromoService.findPublicBySubdomain(subdomain);
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTItpromoDto) {
    return this.tItpromoService.create(req.user.tenant, dto);
  }

  @Post('batch')
  createMany(@Req() req: TenantRequest, @Body() dto: CreateTItpromoBatchDto) {
    return this.tItpromoService.createMany(req.user.tenant, dto.items);
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
}
