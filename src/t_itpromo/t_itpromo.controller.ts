import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { resolvePublicSubdomainFromRequest } from '../public/tenant-resolver';
import { CreateTItpromoBatchDto } from './dto/create-t_itpromo-batch.dto';
import { CreateTItpromoDto } from './dto/create-t_itpromo.dto';
import {
  SyncTItpromoBatchDto,
  SyncTItpromoBatchItemDto,
} from './dto/sync-t_itpromo-batch.dto';
import { UpdateTItpromoDto } from './dto/update-t_itpromo.dto';
import { TItpromoService } from './t_itpromo.service';

interface TenantRequest extends Request {
  user: { tenant: string };
}

@Controller('t_itpromo')
@UseGuards(TenantJwtGuard)
export class TItpromoController {
  constructor(private readonly tItpromoService: TItpromoService) {}

  private normalizeSyncItems(
    dto: SyncTItpromoBatchDto,
  ): SyncTItpromoBatchItemDto[] {
    const directItems = Array.isArray(dto.items) ? dto.items : [];
    const groupedItems = (dto.Empresa ?? []).flatMap((group) => {
      const groupCdemp = Number(group.cdemp);
      if (!Number.isFinite(groupCdemp) || groupCdemp <= 0) {
        throw new BadRequestException('cdemp invalido no agrupamento Empresa.');
      }

      return (group.items ?? []).map((item) => {
        const itemEmpromo =
          typeof item.empromo === 'number' && Number.isFinite(item.empromo)
            ? Math.floor(item.empromo)
            : null;

        if (itemEmpromo !== null && itemEmpromo !== Math.floor(groupCdemp)) {
          throw new BadRequestException(
            `empromo divergente no item ${item.id}.`,
          );
        }

        return {
          ...item,
          empromo: itemEmpromo ?? Math.floor(groupCdemp),
        };
      });
    });

    const normalized = [...directItems, ...groupedItems];
    if (!normalized.length) {
      throw new BadRequestException(
        'Informe items ou Empresa[].items para sincronizacao.',
      );
    }

    return normalized;
  }

  @Get()
  findAll(@Req() req: TenantRequest) {
    return this.tItpromoService.findByTenant(req.user.tenant);
  }

  @Public()
  @Get('public')
  findPublic(@Req() req: Request) {
    const subdomain = resolvePublicSubdomainFromRequest(req);
    return this.tItpromoService.findPublicBySubdomain(subdomain);
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateTItpromoDto) {
    return this.tItpromoService.create(req.user.tenant, dto);
  }

  @Post('batch')
  createMany(@Req() req: TenantRequest, @Body() dto: CreateTItpromoBatchDto) {
    return this.tItpromoService.createMany(req.user.tenant, dto.items);
  }

  @Post('sync-batch')
  syncBatch(@Req() req: TenantRequest, @Body() dto: SyncTItpromoBatchDto) {
    return this.tItpromoService.syncBatchById(
      req.user.tenant,
      this.normalizeSyncItems(dto),
    );
  }

  @Patch(':autocod')
  update(
    @Req() req: TenantRequest,
    @Param('autocod', ParseIntPipe) autocod: number,
    @Body() dto: UpdateTItpromoDto,
  ) {
    return this.tItpromoService.update(req.user.tenant, autocod, dto);
  }

  @Delete(':autocod')
  remove(
    @Req() req: TenantRequest,
    @Param('autocod', ParseIntPipe) autocod: number,
  ) {
    return this.tItpromoService.remove(req.user.tenant, autocod);
  }
}
