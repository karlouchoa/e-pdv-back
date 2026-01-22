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
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTItensComboDto } from './dto/create-t_itenscombo.dto';
import { UpdateTItensComboDto } from './dto/update-t_itenscombo.dto';
import { TItensComboService } from './t_itenscombo.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itenscombo')
@UseGuards(JwtAuthGuard)
export class TItensComboController {
  constructor(private readonly tItensComboService: TItensComboService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTItensComboDto) {
    return this.tItensComboService.create(req.user.tenant, dto);
  }

  @Get()
  findAll(@Req() req: TenantRequest) {
    return this.tItensComboService.findAll(req.user.tenant);
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tItensComboService.findOne(req.user.tenant, id);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTItensComboDto,
  ) {
    return this.tItensComboService.update(req.user.tenant, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.tItensComboService.remove(req.user.tenant, id);
  }
}
