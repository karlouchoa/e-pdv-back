import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  TenantPrisma as Prisma,
  type TenantClient,
} from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { BomPdfService } from './bom-pdf.service';

import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';

import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';

import { RegisterOrderStatusDto } from './dto/register-order-status.dto';
import { RecordFinishedGoodDto } from './dto/record-finished-good.dto';
import { RecordRawMaterialDto } from './dto/record-raw-material.dto';
import { FindProductionOrdersQueryDto } from './dto/find-production-orders.dto';

@Injectable()
export class ProductionService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly bomPdfService: BomPdfService,
  ) {}

  private async prisma(tenant: string): Promise<TenantClient> {
    return this.tenantDb.getTenantClient(tenant);
  }

  //
  // --------------------------------------------------------------------------
  //  BOM (Ficha Técnica)
  // --------------------------------------------------------------------------
  //

  async listBomRecords(tenant: string) {
    const db = await this.prisma(tenant);
    return db.bom_headers.findMany({
      where: { tenant_id: tenant },
      include: { items: { orderBy: { line_number: 'asc' } } },
      orderBy: [{ created_at: 'desc' }],
    });
  }

  async getBom(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    const bom = await db.bom_headers.findFirst({
      where: { id, tenant_id: tenant },
      include: { items: { orderBy: { line_number: 'asc' } } },
    });

    if (!bom) throw new NotFoundException(`BOM '${id}' não encontrado.`);

    return bom;
  }

  async getBomPdf(tenant: string, id: string) {
    const bom = await this.getBom(tenant, id);
    const productDescription = await this.getProductDescription(
      tenant,
      bom.product_code,
    );
    const file = await this.bomPdfService.createBomPdf({
      ...bom,
      product_description: productDescription,
    });

    return {
      filename: this.buildBomPdfFilename(
        bom.product_code,
        bom.version,
        bom.created_at,
      ),
      file,
    };
  }

  async createBom(tenant: string, dto: CreateBomDto) {
    const db = await this.prisma(tenant);

    const totalCost = dto.items.reduce(
      (s, i) => s + i.quantity * i.unitCost,
      0,
    );

    const unitCost =
      dto.lotSize > 0 ? Number(totalCost / dto.lotSize) : 0;

    try {
      return db.$transaction(async (tx) => {
        const header = await tx.bom_headers.create({
          data: {
            tenant_id: tenant,
            product_code: dto.productCode,
            version: dto.version,
            lot_size: dto.lotSize,
            validity_days: dto.validityDays,
            margin_target: dto.marginTarget,
            margin_achieved: dto.marginAchieved,
            total_cost: totalCost,
            unit_cost: unitCost,
            notes: dto.notes ?? null,
          },
        });

        await tx.bom_items.createMany({
          data: dto.items.map((item, index) => ({
            bom_id: header.id,
            line_number: index + 1,
            component_code: item.componentCode,
            description: item.description || null,
            quantity: item.quantity,
            unit_cost: item.unitCost,
          })),
        });

        return tx.bom_headers.findUnique({
          where: { id: header.id },
          include: { items: { orderBy: { line_number: 'asc' } } },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um BOM com mesmo produto/versão.',
        );
      }
      throw e;
    }
  }

  async updateBom(tenant: string, id: string, dto: UpdateBomDto) {
    const db = await this.prisma(tenant);

    const existing = await db.bom_headers.findFirst({
      where: { id, tenant_id: tenant },
      include: { items: true },
    });

    if (!existing)
      throw new NotFoundException(`BOM '${id}' não encontrado.`);

    const items = dto.items
      ? dto.items.map(i => ({
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        }))
      : existing.items.map(i => ({
          quantity: Number(i.quantity),
          unitCost: Number(i.unit_cost),
        }));

    
    const lotSize = Number(dto.lotSize ?? existing.lot_size);

    const totalCost = items.reduce(
      (s, i) => s + i.quantity * i.unitCost,
      0,
    );

    const unitCost = lotSize > 0 ? Number(totalCost / lotSize) : 0;

    return db.$transaction(async (tx) => {
      await tx.bom_headers.update({
        where: { id },
        data: {
          product_code: dto.productCode ?? existing.product_code,
          version: dto.version ?? existing.version,
          lot_size: lotSize,
          validity_days: dto.validityDays ?? existing.validity_days,
          margin_target: dto.marginTarget ?? existing.margin_target,
          margin_achieved:
            dto.marginAchieved ?? existing.margin_achieved,
          total_cost: totalCost,
          unit_cost: unitCost,
          updated_at: new Date(),
          notes: dto.notes ?? existing.notes,
        },
      });

      if (dto.items) {
        await tx.bom_items.deleteMany({ where: { bom_id: id } });

        await tx.bom_items.createMany({
          data: dto.items.map((i, idx) => ({
            bom_id: id,
            line_number: idx + 1,
            component_code: i.componentCode,
            description: i.description || null,
            quantity: i.quantity,
            unit_cost: i.unitCost,
          })),
        });
      }

      return tx.bom_headers.findUnique({
        where: { id },
        include: { items: { orderBy: { line_number: 'asc' } } },
      });
    });
  }

  async removeBom(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    const exists = await db.bom_headers.findFirst({
      where: { id, tenant_id: tenant },
    });

    if (!exists)
      throw new NotFoundException(`BOM '${id}' não encontrado.`);

    await db.bom_headers.delete({ where: { id } });

    return { id };
  }

  //
  // --------------------------------------------------------------------------
  //  PRODUCTION ORDERS
  // --------------------------------------------------------------------------
  //

  async createOrder(tenant: string, dto: CreateProductionOrderDto) {
    const db = await this.prisma(tenant);

    try {
      return db.production_orders.create({
        data: {
          external_code: dto.external_code,
          product_code: dto.product_code,
          quantity_planned: dto.quantity_planned,
          unit: dto.unit,
          start_date: new Date(dto.start_date),
          due_date: new Date(dto.due_date),
          notes: dto.notes ?? null,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma ordem com este external_code.',
        );
      }
      throw e;
    }
  }

  async findOrders(
    tenant: string,
    query: FindProductionOrdersQueryDto,
  ) {
    const db = await this.prisma(tenant);

    return db.production_orders.findMany({
      where: {
        ...(query.external_code && {
          external_code: query.external_code,
        }),
        ...(query.product_code && {
          product_code: query.product_code,
        }),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getOrder(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    const order = await db.production_orders.findUnique({
      where: { id },
      include: {
        statuses: { orderBy: { event_time: 'desc' } },
        finished_goods: { orderBy: { posted_at: 'desc' } },
        raw_materials: { orderBy: { consumed_at: 'desc' } },
      },
    });

    if (!order)
      throw new NotFoundException(`Ordem '${id}' não encontrada.`);

    return order;
  }

  async updateOrder(
    tenant: string,
    id: string,
    dto: UpdateProductionOrderDto,
  ) {
    const db = await this.prisma(tenant);

    const exists = await db.production_orders.findUnique({
      where: { id },
    });

    if (!exists)
      throw new NotFoundException(`Ordem '${id}' não encontrada.`);

    try {
      return db.production_orders.update({
        where: { id },
        data: {
          external_code: dto.external_code ?? exists.external_code,
          product_code: dto.product_code ?? exists.product_code,
          quantity_planned:
            dto.quantity_planned ?? exists.quantity_planned,
          unit: dto.unit ?? exists.unit,
          start_date:
            dto.start_date != null
              ? new Date(dto.start_date)
              : exists.start_date,
          due_date:
            dto.due_date != null
              ? new Date(dto.due_date)
              : exists.due_date,
          notes: dto.notes ?? exists.notes,
          updated_at: new Date(),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma ordem com este external_code.',
        );
      }
      throw e;
    }
  }

  //
  // --------------------------------------------------------------------------
  // ORDER STATUSES
  // --------------------------------------------------------------------------
  //

  async addStatus(tenant: string, id: string, dto: RegisterOrderStatusDto) {
    const db = await this.prisma(tenant);

    const exists = await db.production_orders.findUnique({
      where: { id },
    });

    if (!exists)
      throw new NotFoundException(`Ordem '${id}' não encontrada.`);

    return db.production_order_status.create({
      data: {
        order_id: id,
        status: dto.status,
        responsible: dto.responsible,
        remarks: dto.remarks ?? null,
        ...(dto.event_time && {
          event_time: new Date(dto.event_time),
        }),
      },
    });
  }

  async getStatuses(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    return db.production_order_status.findMany({
      where: { order_id: id },
      orderBy: { event_time: 'desc' },
    });
  }

  //
  // --------------------------------------------------------------------------
  // FINISHED GOODS
  // --------------------------------------------------------------------------
  //

  async addFinishedGood(
    tenant: string,
    id: string,
    dto: RecordFinishedGoodDto,
  ) {
    const db = await this.prisma(tenant);

    const exists = await db.production_orders.findUnique({
      where: { id },
    });

    if (!exists)
      throw new NotFoundException(`Ordem '${id}' não encontrada.`);

    return db.order_finished_goods.create({
      data: {
        order_id: id,
        product_code: dto.product_code,
        lot_number: dto.lot_number ?? null,
        quantity_good: dto.quantity_good,
        quantity_scrap: dto.quantity_scrap ?? 0,
        unit_cost: dto.unit_cost ?? null,
        ...(dto.posted_at && {
          posted_at: new Date(dto.posted_at),
        }),
      },
    });
  }

  async getFinishedGoods(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    return db.order_finished_goods.findMany({
      where: { order_id: id },
      orderBy: { posted_at: 'desc' },
    });
  }

  //
  // --------------------------------------------------------------------------
  // RAW MATERIALS
  // --------------------------------------------------------------------------
  //

  async addRawMaterial(
    tenant: string,
    id: string,
    dto: RecordRawMaterialDto,
  ) {
    const db = await this.prisma(tenant);

    const exists = await db.production_orders.findUnique({
      where: { id },
    });

    if (!exists)
      throw new NotFoundException(`Ordem '${id}' não encontrada.`);

    return db.order_raw_materials.create({
      data: {
        order_id: id,
        component_code: dto.component_code,
        description: dto.description ?? null,
        quantity_used: dto.quantity_used,
        unit: dto.unit,
        unit_cost: dto.unit_cost ?? null,
        warehouse: dto.warehouse ?? null,
        batch_number: dto.batch_number ?? null,
        ...(dto.consumed_at && {
          consumed_at: new Date(dto.consumed_at),
        }),
      },
    });
  }

  async getRawMaterials(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    return db.order_raw_materials.findMany({
      where: { order_id: id },
      orderBy: { consumed_at: 'desc' },
    });
  }

  private async getProductDescription(
    tenant: string,
    productCode: string,
  ): Promise<string | null> {
    const code = productCode?.trim();
    if (!code) {
      return null;
    }

    const db = await this.prisma(tenant);
    const numericCode = Number(code);
    const where = Number.isFinite(numericCode)
      ? { cditem: numericCode }
      : { deitem: code };
    const product = await db.t_itens.findFirst({
      where,
      select: { deitem: true },
    });

    return product?.deitem?.trim() ?? null;
  }

  private buildBomPdfFilename(
    productCode: string,
    version: string,
    createdAt: Date,
  ) {
    const slug = this.slugify(`${productCode}-${version}`) || 'bom';
    const datestamp = this.formatDateForFilename(createdAt);
    return `${slug}-${datestamp}.pdf`;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  private formatDateForFilename(value: Date) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
