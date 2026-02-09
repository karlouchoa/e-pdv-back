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
  Query,
} from '@nestjs/common';
import { TItensService } from './t_itens.service';
import { CreateTItemDto } from './dto/create-t_itens.dto';
import { UpdateTItemDto } from './dto/update-t_itens.dto';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { Request } from 'express';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itens')
export class TItensController {
  constructor(private readonly tItensService: TItensService) {}

  /** 🔹 CREATE */
  @Post()
  @UseGuards(TenantJwtGuard)
  create(@Req() req: TenantRequest, @Body() dto: CreateTItemDto) {
    return this.tItensService.create(req.user.tenant, dto);
  }

  /** 🔹 UPDATE (UUID) */
  @UseGuards(TenantJwtGuard)
  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTItemDto,
  ) {
    return this.tItensService.update(req.user.tenant, id, dto);
  }

  /** 🔹 FIND ALL */
  @UseGuards(TenantJwtGuard)
  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query() query: Record<string, string | string[]>,
  ) {
    // console.log(
    //   '[t_itens] Request:',
    //   req.method,
    //   req.originalUrl ?? req.url,
    //   'Query:',
    //   query,
    // );
    return this.tItensService.findAll(req.user.tenant, query);
  }

  @UseGuards(TenantJwtGuard)
  @Get('search')
  searchByDescription(
    @Req() req: TenantRequest,
    @Query('descricao') descricao?: string,
    @Query('matprima') matprima?: string,
    @Query('itprodsn') itprodsn?: string,
  ) {
    return this.tItensService.searchByDescription(req.user.tenant, descricao, {
      matprima,
      itprodsn,
    });
  }

  /** 🔹 FIND ONE (UUID) */
  @UseGuards(TenantJwtGuard)
  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tItensService.findOne(req.user.tenant, id);
  }

  /** 🔹 DELETE (UUID) */
  @UseGuards(TenantJwtGuard)
  @Delete(':id')
  remove(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body('cdemp') cdemp: number,
  ) {
    return this.tItensService.remove(req.user.tenant, id, cdemp);
  }
}
