import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { RolesGuard } from '../auth/roles.guard';
import {
  CashierReportQueryDto,
  CashFinalizeDto,
  CashItemSearchDto,
  CloseCashierDto,
  CourierQueryDto,
  CustomersQueryDto,
  DispatchSaleDto,
  OpenCashierDto,
  SalesQueryDto,
  UpsertCourierDto,
  UpsertCustomerAddressDto,
  UpsertCustomerDto,
} from './dto/admin-operations.dto';
import { AdminOperationsService } from './admin-operations.service';

type TenantRequest = Request & {
  user?: JwtPayload;
  tenant?: { slug?: string };
};

@Controller('admin')
@UseGuards(TenantJwtGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class AdminOperationsController {
  constructor(private readonly adminOpsService: AdminOperationsService) {}

  private getTenant(req: TenantRequest): string {
    const tenant = req.tenant?.slug ?? req.user?.tenant;
    if (!tenant) {
      throw new ForbiddenException('Tenant nao identificado.');
    }
    return tenant;
  }

  private getWarehouse(req: TenantRequest): number | null {
    const raw = req.headers['x-warehouse'];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!candidate) return null;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private getUserIdentifier(req: TenantRequest): string {
    const value = req.user?.sub ?? req.user?.email ?? req.user?.name;
    if (!value) {
      throw new ForbiddenException('Usuario nao identificado no token.');
    }
    return String(value).trim();
  }

  private canViewSensitiveCashierTotals(req: TenantRequest): boolean {
    return Boolean(req.user?.admin);
  }

  @Get('entregadores')
  listCouriers(@Req() req: TenantRequest, @Query() query: CourierQueryDto) {
    return this.adminOpsService.listCouriers(
      this.getTenant(req),
      this.getWarehouse(req),
      query,
    );
  }

  @Post('entregadores')
  createCourier(@Req() req: TenantRequest, @Body() dto: UpsertCourierDto) {
    return this.adminOpsService.createCourier(
      this.getTenant(req),
      this.getWarehouse(req),
      dto,
    );
  }

  @Patch('entregadores/:cdsep')
  updateCourier(
    @Req() req: TenantRequest,
    @Param('cdsep', ParseIntPipe) cdsep: number,
    @Body() dto: UpsertCourierDto,
  ) {
    return this.adminOpsService.updateCourier(
      this.getTenant(req),
      this.getWarehouse(req),
      cdsep,
      dto,
    );
  }

  @Delete('entregadores/:cdsep')
  removeCourier(
    @Req() req: TenantRequest,
    @Param('cdsep', ParseIntPipe) cdsep: number,
  ) {
    return this.adminOpsService.removeCourier(
      this.getTenant(req),
      this.getWarehouse(req),
      cdsep,
    );
  }

  @Get('vendas')
  listSales(@Req() req: TenantRequest, @Query() query: SalesQueryDto) {
    return this.adminOpsService.listSales(
      this.getTenant(req),
      this.getWarehouse(req),
      query,
    );
  }

  @Get('vendas/printers')
  listSalePrinters(@Req() req: TenantRequest) {
    return this.adminOpsService.listPrinters(
      this.getTenant(req),
      this.getWarehouse(req),
    );
  }

  @Get('vendas/:id')
  getSale(@Req() req: TenantRequest, @Param('id') saleId: string) {
    return this.adminOpsService.getSaleDetails(
      this.getTenant(req),
      this.getWarehouse(req),
      saleId,
    );
  }

  @Patch('vendas/:id/despacho')
  dispatchSale(
    @Req() req: TenantRequest,
    @Param('id') saleId: string,
    @Body() dto: DispatchSaleDto,
  ) {
    return this.adminOpsService.dispatchSale(
      this.getTenant(req),
      this.getWarehouse(req),
      saleId,
      this.getUserIdentifier(req),
      dto,
    );
  }

  @Get('clientes')
  listCustomers(@Req() req: TenantRequest, @Query() query: CustomersQueryDto) {
    return this.adminOpsService.listCustomers(
      this.getTenant(req),
      this.getWarehouse(req),
      query,
    );
  }

  @Post('clientes')
  createCustomer(@Req() req: TenantRequest, @Body() dto: UpsertCustomerDto) {
    return this.adminOpsService.createCustomer(
      this.getTenant(req),
      this.getWarehouse(req),
      dto,
    );
  }

  @Get('clientes/:id')
  getCustomer(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.adminOpsService.getCustomer(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
    );
  }

  @Patch('clientes/:id')
  updateCustomer(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpsertCustomerDto,
  ) {
    return this.adminOpsService.updateCustomer(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
      dto,
    );
  }

  @Delete('clientes/:id')
  removeCustomer(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.adminOpsService.removeCustomer(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
    );
  }

  @Get('clientes/:id/enderecos')
  listCustomerAddresses(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.adminOpsService.listCustomerAddresses(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
    );
  }

  @Post('clientes/:id/enderecos')
  createCustomerAddress(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpsertCustomerAddressDto,
  ) {
    return this.adminOpsService.createCustomerAddress(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
      this.getUserIdentifier(req),
      dto,
    );
  }

  @Patch('clientes/:id/enderecos/:addressId')
  updateCustomerAddress(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpsertCustomerAddressDto,
  ) {
    return this.adminOpsService.updateCustomerAddress(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
      addressId,
      this.getUserIdentifier(req),
      dto,
    );
  }

  @Delete('clientes/:id/enderecos/:addressId')
  removeCustomerAddress(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.adminOpsService.removeCustomerAddress(
      this.getTenant(req),
      this.getWarehouse(req),
      id,
      addressId,
    );
  }

  @Get('caixa/status')
  getCashierStatus(@Req() req: TenantRequest) {
    return this.adminOpsService.getCashierStatus(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
    );
  }

  @Post('caixa/abrir')
  openCashier(@Req() req: TenantRequest, @Body() dto: OpenCashierDto) {
    return this.adminOpsService.openCashier(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
      dto,
    );
  }

  @Post('caixa/fechar')
  closeCashier(@Req() req: TenantRequest, @Body() dto: CloseCashierDto) {
    return this.adminOpsService.closeCashier(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
      dto,
    );
  }

  @Get('caixa/relatorios/sintetico')
  getCashierSyntheticReport(
    @Req() req: TenantRequest,
    @Query() query: CashierReportQueryDto,
  ) {
    return this.adminOpsService.getCashierSyntheticReport(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
      query,
      this.canViewSensitiveCashierTotals(req),
    );
  }

  @Get('caixa/relatorios/sintetico/pdf')
  async downloadCashierSyntheticReportPdf(
    @Req() req: TenantRequest,
    @Query() query: CashierReportQueryDto,
    @Res() res: Response,
  ) {
    const { filename, file } =
      await this.adminOpsService.getCashierSyntheticReportPdf(
        this.getTenant(req),
        this.getWarehouse(req),
        this.getUserIdentifier(req),
        query,
        this.canViewSensitiveCashierTotals(req),
      );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', file.length.toString());
    return res.send(file);
  }

  @Get('caixa/relatorios/analitico')
  getCashierAnalyticReport(
    @Req() req: TenantRequest,
    @Query() query: CashierReportQueryDto,
  ) {
    return this.adminOpsService.getCashierAnalyticReport(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
      query,
    );
  }

  @Get('caixa/relatorios/analitico/pdf')
  async downloadCashierAnalyticReportPdf(
    @Req() req: TenantRequest,
    @Query() query: CashierReportQueryDto,
    @Res() res: Response,
  ) {
    const { filename, file } =
      await this.adminOpsService.getCashierAnalyticReportPdf(
        this.getTenant(req),
        this.getWarehouse(req),
        this.getUserIdentifier(req),
        query,
      );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', file.length.toString());
    return res.send(file);
  }

  @Get('caixa/formas-pagamento')
  listCashierPaymentMethods(@Req() req: TenantRequest) {
    return this.adminOpsService.listCashierPaymentMethods(this.getTenant(req));
  }

  @Get('caixa/itens')
  searchCashierItems(
    @Req() req: TenantRequest,
    @Query() query: CashItemSearchDto,
  ) {
    return this.adminOpsService.searchCashierItems(
      this.getTenant(req),
      this.getWarehouse(req),
      query,
    );
  }

  @Get('caixa/pedidos-abertos')
  listOpenSalesForCashier(@Req() req: TenantRequest) {
    return this.adminOpsService.listOpenSalesForCashier(
      this.getTenant(req),
      this.getWarehouse(req),
    );
  }

  @Get('caixa/pedidos-abertos/:id')
  getOpenSaleForCashier(
    @Req() req: TenantRequest,
    @Param('id') saleId: string,
  ) {
    return this.adminOpsService.getOpenSaleForCashier(
      this.getTenant(req),
      this.getWarehouse(req),
      saleId,
    );
  }

  @Post('caixa/finalizar')
  finalizeCashierSale(@Req() req: TenantRequest, @Body() dto: CashFinalizeDto) {
    return this.adminOpsService.finalizeCashierSale(
      this.getTenant(req),
      this.getWarehouse(req),
      this.getUserIdentifier(req),
      dto,
    );
  }
}
