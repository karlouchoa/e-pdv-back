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
import { CreateProductBDto } from './dto/create-product-b.dto';
import { UpdateProductBDto } from './dto/update-product-b.dto';
import { ProductBService } from './product-b.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('admin/products/b')
export class ProductBController {
  constructor(private readonly productBService: ProductBService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateProductBDto) {
    return this.productBService.create(req.user.tenant, dto);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductBDto,
  ) {
    return this.productBService.update(req.user.tenant, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.productBService.remove(req.user.tenant, id);
  }
}
