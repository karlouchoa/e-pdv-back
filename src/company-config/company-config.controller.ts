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
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { resolvePublicSubdomainFromRequest } from '../public/tenant-resolver';
import { CompanyConfigService } from './company-config.service';
import { LookupCepParamsDto } from './dto/lookup-cep-params.dto';
import { LookupCnpjParamsDto } from './dto/lookup-cnpj-params.dto';
import { StoreHoursQueryDto } from './dto/store-hours-query.dto';
import { UpdateStoreHourDto } from './dto/update-store-hour.dto';

interface TenantRequest extends Request {
  user?: { tenant?: string };
}

const getTenantFromRequest = (req: TenantRequest) => {
  const tenant = req.user?.tenant?.trim();
  if (!tenant) {
    throw new BadRequestException('Tenant nao encontrado no token JWT.');
  }
  return tenant;
};

const resolveTenantForReadOnlyRequest = (req: TenantRequest) => {
  const tenantFromJwt = req.user?.tenant?.trim();
  if (tenantFromJwt) return tenantFromJwt;
  return resolvePublicSubdomainFromRequest(req);
};

@Controller('company-config')
@UseGuards(TenantJwtGuard)
export class CompanyConfigLookupController {
  constructor(private readonly companyConfigService: CompanyConfigService) {}

  @Get('cnpj/:cnpj')
  lookupCnpj(@Req() req: TenantRequest, @Param() params: LookupCnpjParamsDto) {
    getTenantFromRequest(req);
    return this.companyConfigService.lookupCnpj(params.cnpj);
  }

  @Get('cep/:cep')
  lookupCep(@Req() req: TenantRequest, @Param() params: LookupCepParamsDto) {
    getTenantFromRequest(req);
    return this.companyConfigService.lookupCep(params.cep);
  }
}

@Controller(['StoreHours', 'store-hours', 'storehours', 'T_STOREHOURS'])
@UseGuards(TenantJwtGuard)
export class StoreHoursController {
  constructor(private readonly companyConfigService: CompanyConfigService) {}

  @Get()
  list(@Req() req: TenantRequest, @Query() query: StoreHoursQueryDto) {
    return this.companyConfigService.listStoreHours(
      getTenantFromRequest(req),
      query,
    );
  }

  @Public()
  @Get('public')
  listPublic(@Req() req: TenantRequest, @Query() query: StoreHoursQueryDto) {
    return this.companyConfigService.listStoreHoursPublicBySubdomain(
      resolveTenantForReadOnlyRequest(req),
      query,
    );
  }

  @Public()
  @Get('public/:id')
  findOnePublic(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.companyConfigService.findStoreHourByIdPublicBySubdomain(
      resolveTenantForReadOnlyRequest(req),
      id,
    );
  }

  @Get(':id')
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.companyConfigService.findStoreHourById(
      getTenantFromRequest(req),
      id,
    );
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() body: unknown) {
    return this.companyConfigService.createOrReplaceStoreHours(
      getTenantFromRequest(req),
      body,
    );
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStoreHourDto,
  ) {
    return this.companyConfigService.updateStoreHour(
      getTenantFromRequest(req),
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.companyConfigService.deleteStoreHour(
      getTenantFromRequest(req),
      id,
    );
  }
}
