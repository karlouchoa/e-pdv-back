import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ProductionService } from './production.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { RegisterOrderStatusDto } from './dto/register-order-status.dto';
import { RecordFinishedGoodDto } from './dto/record-finished-good.dto';
import { RecordRawMaterialDto } from './dto/record-raw-material.dto';
import { FindProductionOrdersQueryDto } from './dto/find-production-orders.dto';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { IssueRawMaterialsDto } from './dto/issue-raw-materials.dto';
import { CompleteProductionOrderDto } from './dto/complete-production-order.dto';

interface TenantRequest extends Request {
  user?: { tenant?: string };
}

@UseGuards(AuthGuard('jwt'))
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  private getTenant(req: TenantRequest) {
    const tenant = req.user?.tenant;

    if (!tenant) {
      throw new BadRequestException('Tenant nao encontrado no token.');
    }

    return tenant;
  }

  @Get('bom/product/:productCode')
  getLatestBomByProductCode(
    @Req() req: TenantRequest,
    @Param('productCode') productCode: string,
  ) {
    const tenant = this.getTenant(req);
    // Chama a nova função do service para buscar a BOM mais recente
    return this.productionService.getLatestProductFormula(tenant, productCode);
  }

  @Get('bom')
  listBoms(@Req() req: TenantRequest) {
    return this.productionService.listBomRecords(this.getTenant(req));
  }

  @Post('bom')
  createBom(@Req() req: TenantRequest, @Body() dto: CreateBomDto) {
    return this.productionService.createBom(this.getTenant(req), dto);
  }

  @Get('bom/:id')
  getBom(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.productionService.getBom(this.getTenant(req), id);
  }

  @Get('bom/:id/pdf')
  async downloadBomPdf(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const { filename, file } = await this.productionService.getBomPdf(
      this.getTenant(req),
      id,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', file.length.toString());

    return res.send(file);
  }

  @Patch('bom/:id')
  updateBom(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBomDto,
  ) {
    return this.productionService.updateBom(this.getTenant(req), id, dto);
  }

  @Delete('bom/:id')
  removeBom(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.productionService.removeBom(this.getTenant(req), id);
  }

  @Post('orders')
  createOrder(
    
    @Req() req: TenantRequest,
    @Body() dto: CreateProductionOrderDto,

    
  ) {
    console.log("DTO recebido pelo backend:", dto);
    return this.productionService.createOrder(this.getTenant(req), dto);
  }

  @Get('orders')
  findOrders(
    @Req() req: TenantRequest,
    @Query() query: FindProductionOrdersQueryDto,
  ) {
    return this.productionService.findOrders(this.getTenant(req), query);
  }

  @Get('orders/:id')
  getOrder(
    @Req() req: TenantRequest,
    @Param('id', new ParseIntPipe()) op: number,
  ) {
    return this.productionService.getOrder(this.getTenant(req), op);
  }

  @Patch('orders/:id')
  updateOrder(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionService.updateOrder(this.getTenant(req), id, dto);
  }

  @Post('orders/:id/status')
  addStatus(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RegisterOrderStatusDto,
  ) {
    return this.productionService.addStatus(this.getTenant(req), id, dto);
  }

  @Post('orders/:id/issue-raw-materials')
  issueRawMaterials(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: IssueRawMaterialsDto,
  ) {
    return this.productionService.issueRawMaterials(
      this.getTenant(req),
      id,
      dto,
    );
  }

  @Post('orders/:id/complete')
  completeOrder(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteProductionOrderDto,
  ) {
    return this.productionService.completeOrder(
      this.getTenant(req),
      id,
      dto,
    );
  }

  @Get('orders/:id/status')
  getStatuses(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.productionService.getStatuses(this.getTenant(req), id);
  }

  @Post('orders/:id/finished-goods')
  addFinishedGood(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordFinishedGoodDto,
  ) {
    return this.productionService.addFinishedGood(
      this.getTenant(req),
      id,
      dto,
    );
  }

  @Get('orders/:id/finished-goods')
  getFinishedGoods(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.productionService.getFinishedGoods(this.getTenant(req), id);
  }

  @Post('orders/:id/raw-materials')
  addRawMaterial(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordRawMaterialDto,
  ) {
    return this.productionService.addRawMaterial(
      this.getTenant(req),
      id,
      dto,
    );
  }

  @Get('orders/:id/raw-materials')
  getRawMaterials(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.productionService.getRawMaterials(this.getTenant(req), id);
  }
}
