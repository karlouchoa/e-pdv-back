import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { CreateProductADto } from './dto/create-product-a.dto';
import { UpdateProductADto } from './dto/update-product-a.dto';
import { ProductAService } from './product-a.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('admin/products/a')
export class ProductAController {
  constructor(private readonly productAService: ProductAService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateProductADto) {
    return this.productAService.create(req.user.tenant, dto);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductADto,
  ) {
    return this.productAService.update(req.user.tenant, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.productAService.remove(req.user.tenant, id);
  }
}
