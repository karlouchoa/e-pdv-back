import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Request } from 'express';
import { TGritensService } from './t_gritens.service';
import { CreateTGritensDto } from './dto/create-t_gritens.dto';
import { UpdateTGritensDto } from './dto/update-t_gritens.dto';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_gritens')
@UseGuards(TenantJwtGuard)
export class TGritensController {
  constructor(private readonly tGritensService: TGritensService) {}

  @Post()
  async create(
    @Req() req: TenantRequest,
    @Body() createTGritensDto: CreateTGritensDto,
  ) {
    const tenant = req.user.tenant;
    return this.tGritensService.create(tenant, createTGritensDto);
  }

  @Patch(':id')
  async update(
    @Req() req: TenantRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTGritensDto: UpdateTGritensDto,
  ) {
    const tenant = req.user.tenant;
    return this.tGritensService.update(tenant, id, updateTGritensDto);
  }

  @Delete(':id')
  async remove(
    @Req() req: TenantRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenant = req.user.tenant;
    return this.tGritensService.remove(tenant, id);
  }

  @Get()
  async findAll(
    @Req() req: TenantRequest,
    @Query('iniciais') iniciais?: string,
  ) {
    const tenant = req.user.tenant;
    return this.tGritensService.findAll(tenant, iniciais);
  }

  @Get(':id')
  async findById(
    @Req() req: TenantRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenant = req.user.tenant;
    return this.tGritensService.findById(tenant, id);
  }
}
