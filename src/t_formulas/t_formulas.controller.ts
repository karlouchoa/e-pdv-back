import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { TFormulasService } from './t_formulas.service';
import { CreateTFormulaDto } from './dto/create-t_formulas.dto';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_formulas')
@UseGuards(TenantJwtGuard)
export class TFormulasController {
  constructor(private readonly tFormulasService: TFormulasService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTFormulaDto) {
    return this.tFormulasService.create(req.user.tenant, dto);
  }

  private parseCditem(raw: string) {
    const trimmed = raw?.trim();
    if (!trimmed) {
      throw new BadRequestException('O parametro cditem e obrigatorio.');
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('O parametro cditem deve ser numerico.');
    }

    return parsed;
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tFormulasService.findOne(req.user.tenant, this.parseCditem(id));
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tFormulasService.remove(req.user.tenant, this.parseCditem(id));
  }
}
