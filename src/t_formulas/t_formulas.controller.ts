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
import { AuthGuard } from '@nestjs/passport';
import { TFormulasService } from './t_formulas.service';
import { CreateTFormulaDto } from './dto/create-t_formulas.dto';
import { UpdateTFormulaDto } from './dto/update-t_formulas.dto';

@Controller('t_formulas')
export class TFormulasController {
  constructor(private readonly tFormulasService: TFormulasService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req, @Body() dto: CreateTFormulaDto) {
    return this.tFormulasService.create(req.user.tenant, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req, @Query('cditem') cditem?: string) {
    const filters =
      typeof cditem === 'string' && cditem.trim().length > 0
        ? { cditem: this.parseCditem(cditem) }
        : undefined;

        console.log('Query params:', req.query); 

      

    return this.tFormulasService.findAll(req.user.tenant, filters);
  }

  private parseCditem(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('O parametro cditem deve ser numerico.');
    }

    return parsed;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    console.log(req) 
    return this.tFormulasService.findOne(req.user.tenant, +id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTFormulaDto,
  ) {
    return this.tFormulasService.update(req.user.tenant, +id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.tFormulasService.remove(req.user.tenant, +id);
  }
}
