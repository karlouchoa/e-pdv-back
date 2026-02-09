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
    console.log(
      '[t_formulas] POST payload',
      JSON.stringify({ tenant: req.user?.tenant, dto }, null, 2),
    );
    return this.tFormulasService.create(req.user.tenant, dto);
  }

  private parseIdItem(raw: string) {
    const trimmed = raw?.trim();
    if (!trimmed) {
      throw new BadRequestException('O parametro idItem e obrigatorio.');
    }

    return trimmed;
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tFormulasService.findOne(req.user.tenant, this.parseIdItem(id));
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tFormulasService.remove(req.user.tenant, this.parseIdItem(id));
  }
}
