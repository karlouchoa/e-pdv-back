import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Module, Provider } from '@nestjs/common';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import type { Request } from 'express';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { TENANT_TABLE_CONFIGS, TenantTableConfig } from './tenant-table.config';
import { GenericTenantService } from './generic-tenant.service';

interface TenantRequest extends Request {
  user?: { tenant?: string };
}

const getServiceToken = (config: TenantTableConfig) =>
  `TENANT_TABLE_SERVICE_${config.name}`;

const toControllerName = (name: string) =>
  name
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join('') + 'Controller';

const createController = (config: TenantTableConfig) => {
  const serviceToken = getServiceToken(config);
  const paramPath = config.primaryKeys.length
    ? config.primaryKeys.map((pk) => `:${pk.name}`).join('/')
    : ':id';

  @Controller(config.route ?? config.name)
  class TenantTableController {
    constructor(
      @Inject(serviceToken)
      private readonly service: GenericTenantService,
    ) {}

    private getTenant(req: TenantRequest) {
      const tenant = req.user?.tenant;
      if (!tenant) {
        throw new BadRequestException('Tenant não encontrado no token JWT.');
      }
      return tenant;
    }

    @UseGuards(TenantJwtGuard)
    @Post()
    create(@Req() req: TenantRequest, @Body() dto: Record<string, any>) {
      return this.service.create(this.getTenant(req), dto);
    }

    @UseGuards(TenantJwtGuard)
    @Get()
    findAll(@Req() req: TenantRequest) {
      return this.service.findAll(this.getTenant(req));
    }

    @UseGuards(TenantJwtGuard)
    @Get(paramPath)
    findOne(
      @Req() req: TenantRequest,
      @Param() params: Record<string, string>,
    ) {
      return this.service.findOne(this.getTenant(req), params);
    }

    @UseGuards(TenantJwtGuard)
    @Patch(paramPath)
    update(
      @Req() req: TenantRequest,
      @Param() params: Record<string, string>,
      @Body() dto: Record<string, any>,
    ) {
      return this.service.update(this.getTenant(req), params, dto);
    }

    @UseGuards(TenantJwtGuard)
    @Delete(paramPath)
    remove(@Req() req: TenantRequest, @Param() params: Record<string, string>) {
      return this.service.remove(this.getTenant(req), params);
    }
  }

  Object.defineProperty(TenantTableController, 'name', {
    value: toControllerName(config.route ?? config.name),
  });

  return TenantTableController;
};

const controllerClasses = TENANT_TABLE_CONFIGS.map(createController);

const serviceProviders: Provider[] = TENANT_TABLE_CONFIGS.map((config) => ({
  provide: getServiceToken(config),
  useFactory: (tenantDbService: TenantDbService) =>
    new GenericTenantService(config, tenantDbService),
  inject: [TenantDbService],
}));

@Module({
  controllers: controllerClasses,
  providers: [TenantDbService, ...serviceProviders],
})
export class TenantTablesModule {}
