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
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itens')
export class TItensController {
  constructor(private readonly tItensService: TItensService) {}

  /** 🔹 CREATE */
  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@Req() req: TenantRequest, @Body() dto: CreateTItemDto) {
    return this.tItensService.create(req.user.tenant, dto);
  }

  
  /** 🔹 UPDATE (UUID) */
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTItemDto,
  ) {
    return this.tItensService.update(req.user.tenant, id, dto);
  }

  /** 🔹 FIND ALL */
  @UseGuards(AuthGuard('jwt'))
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

  /** 🔹 FIND ONE (UUID) */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tItensService.findOne(req.user.tenant, id);
  }

  /** 🔹 DELETE (UUID) */
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tItensService.remove(req.user.tenant, id);
  }
}
