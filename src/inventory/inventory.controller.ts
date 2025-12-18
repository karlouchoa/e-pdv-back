import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
import { MovementFiltersDto } from './dto/movement-filters.dto';
import { MovementSummaryQueryDto } from './dto/movement-summary-query.dto';
import { KardexQueryDto } from './dto/kardex-query.dto';
import { CreateMovementDto } from './dto/create-movement.dto';

interface TenantRequest extends Request {
  user?: { tenant?: string };
}

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  private getTenant(req: TenantRequest) {
    const tenant = req.user?.tenant;
    if (!tenant) {
      throw new BadRequestException('Tenant nao encontrado no token JWT.');
    }
    return tenant;
  }

  @Get('movements/summary')
  getSummary(
    @Req() req: TenantRequest,
    @Query() query: MovementSummaryQueryDto,
  ) {
    console.log('Getting summary with query:', query);
    return this.inventoryService.getSummary(this.getTenant(req), query);
  }

  // @Get('movements')
  // listMovements(
  //   @Req() req: TenantRequest,
  //   @Query() query: MovementFiltersDto,
  // ) {
  //   console.log('Listing movements with query:', query);
  //   return this.inventoryService.listMovements(this.getTenant(req), query);
  // }

  @Get('movements')
  async listMovements(
    @Req() req: TenantRequest,
    @Query() query: MovementFiltersDto,
  ) {
    // console.log('Listing movements with query:', query);

    const result = await this.inventoryService.listMovements(
      this.getTenant(req),
      query,
    );

    // console.log('Listing movements response:', JSON.stringify(result, null, 2));

    return result;
  }


  @Get('movements/:itemId')
  getKardex(
    @Req() req: TenantRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query() query: KardexQueryDto,
  ) {
    // console.log(`Getting kardex for itemId ${itemId} with query:`, query);
    return this.inventoryService.getKardex(this.getTenant(req), itemId, query);
  }

  @Post('movements')
  create(
    @Req() req: TenantRequest,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventoryService.createMovement(this.getTenant(req), dto);
  }
}
