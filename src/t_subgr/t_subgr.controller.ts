import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { CreateTSubgrDto } from './dto/create-t_subgr.dto';
import { UpdateTSubgrDto } from './dto/update-t_subgr.dto';
import { TSubgrService } from './t_subgr.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_subgr')
@UseGuards(TenantJwtGuard)
export class TSubgrController {
  constructor(private readonly tSubgrService: TSubgrService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTSubgrDto) {
    return this.tSubgrService.create(req.user.tenant, dto);
  }

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query('iniciais') iniciais?: string,
    @Query('cdgru') cdgru?: string,
    @Query('id_grupo') id_grupo?: string,
  ) {
    return this.tSubgrService.findAll(req.user.tenant, {
      iniciais,
      cdgru,
      id_grupo,
    });
  }

  @Get(':id')
  findById(@Req() req: TenantRequest, @Param('id', ParseIntPipe) id: number) {
    return this.tSubgrService.findById(req.user.tenant, id);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTSubgrDto,
  ) {
    return this.tSubgrService.update(req.user.tenant, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id', ParseIntPipe) id: number) {
    return this.tSubgrService.remove(req.user.tenant, id);
  }
}
