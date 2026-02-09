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
import { CreateProductCDto } from './dto/create-product-c.dto';
import { UpdateProductCDto } from './dto/update-product-c.dto';
import { ProductCService } from './product-c.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('admin/products/c')
export class ProductCController {
  constructor(private readonly productCService: ProductCService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateProductCDto) {
    return this.productCService.create(req.user.tenant, dto);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductCDto,
  ) {
    return this.productCService.update(req.user.tenant, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.productCService.remove(req.user.tenant, id);
  }
}
