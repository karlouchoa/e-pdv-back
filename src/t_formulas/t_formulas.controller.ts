import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TFormulasService } from './t_formulas.service';
import { CreateTFormulaDto } from './dto/create-t_formulas.dto';
import { UpdateTFormulaDto } from './dto/update-t_formulas.dto';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_formulas')
@UseGuards(JwtAuthGuard)
export class TFormulasController {
  constructor(private readonly tFormulasService: TFormulasService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTFormulaDto) {
    return this.tFormulasService.create(req.user.tenant, dto);
  }

  @Get()
  findAll(@Req() req: TenantRequest, @Query('cditem') cditem?: string) {
    const filters =
      typeof cditem === 'string' && cditem.trim().length > 0
        ? { cditem: this.parseCditem(cditem) }
        : undefined;

        // console.log('Query params:', req.query); 

      

    return this.tFormulasService.findAll(req.user.tenant, filters);
  }

  private parseCditem(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('O parametro cditem deve ser numerico.');
    }

    return parsed;
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    // console.log(req) 
    return this.tFormulasService.findOne(req.user.tenant, +id);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTFormulaDto,
  ) {
    return this.tFormulasService.update(req.user.tenant, +id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tFormulasService.remove(req.user.tenant, +id);
  }
}
