import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  TenantPrisma as Prisma,
  type TenantClient,
} from '../lib/prisma-clients';
import type { Prisma as TenantPrismaTypes } from '../../prisma/generated/client_tenant';
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
  private readonly defaultOrderStatus = 'PENDENTE';
  private readonly systemStatusResponsible = 'SISTEMA';

  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly bomPdfService: BomPdfService,
  ) {}

  private readonly orderScalarSelect: TenantPrismaTypes.production_ordersSelect = {
    id: true,
    external_code: true,
    product_code: true,
    quantity_planned: true,
    unit: true,
    start_date: true,
    due_date: true,
    notes: true,
    created_at: true,
    updated_at: true,
    lote: true,
    validate: true,
    boxes_qty: true,
    box_cost: true,
    labor_per_unit: true,
    sale_price: true,
    markup: true,
    post_sale_tax: true,
    custom_validate_date: true,
    OP: true,
    author_user: true,
    ingredients: true,
    labor: true,
    packaging: true,
    taxes: true,
    Overhead: true,
    totalCost: true,
    unitCost: true,
  };

  private buildOrderSelect(options?: {
    rawMaterials?: boolean;
    statuses?: boolean;
    finishedGoods?: boolean;
  }): TenantPrismaTypes.production_ordersSelect {
    const base: TenantPrismaTypes.production_ordersSelect = {
      ...this.orderScalarSelect,
    };

    if (options?.statuses) {
      base.statuses = { orderBy: { event_time: 'desc' } };
    }

    if (options?.finishedGoods) {
      base.finished_goods = { orderBy: { posted_at: 'desc' } };
    }

    if (options?.rawMaterials) {
      base.raw_materials = { orderBy: { consumed_at: 'desc' } };
    }

    return base;
  }

  
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
      include: { bom_items: { orderBy: { line_number: 'asc' } } },
      orderBy: [{ created_at: 'desc' }],
    });
  }

  async getBom(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    const bom = await db.bom_headers.findFirst({
      where: { id, tenant_id: tenant },
      include: { bom_items: { orderBy: { line_number: 'asc' } } },
    });

    if (!bom) throw new NotFoundException(`BOM '${id}' não encontrado.`);

    return {
      ...bom,
      items: bom.bom_items,  // <-- padroniza o nome
    };
  }

   async getLatestProductFormula(tenant: string, productCode: string) {
    // 1. Conecta ao banco de dados do tenant
    const db = await this.prisma(tenant);

    // 2. Busca o ID da BOM mais recente para o produto específico.
    const latestBomHeader = await db.bom_headers.findFirst({
        where: {
            tenant_id: tenant,
            product_code: productCode,
        },
        // Ordena pelo campo 'created_at' para garantir que pegamos a BOM mais recente
        orderBy: {
            created_at: 'desc',
        },
        select: {
            id: true, // Apenas precisamos do ID aqui
        },
    });

    if (!latestBomHeader) {
        throw new NotFoundException(
            `Nenhuma fórmula/BOM encontrada para o produto '${productCode}'.`
        );
    }
    
    // O ID mais recente encontrado é:
    const latestBomId = latestBomHeader.id;


    // 3. Usa o ID encontrado para buscar a BOM completa (cabeçalho + itens)
    // Reutilizando a lógica existente em `getBom`
    const bomDetails = await db.bom_headers.findUnique({
        where: {
            id: latestBomId, // Usa o ID da BOM mais recente
        },
        include: {
          bom_items: { 
                orderBy: { 
                    line_number: 'asc' 
                } 
            },
        },
    });

    // Esta verificação é redundante se o passo 2 funcionou, mas é uma boa prática
    if (!bomDetails) {
        throw new NotFoundException(`BOM '${latestBomId}' não encontrada após a busca inicial.`);
    }

    return bomDetails;
  }
  
  async getBomPdf(tenant: string, id: string) {
    const bom = await this.getBom(tenant, id);
    const productDescription = await this.getProductDescription(
      tenant,
      bom.product_code,
    );

    const { bom_items: _bomItems, ...bomForPdf } = bom;
    
    const file = await this.bomPdfService.createBomPdf({
      ...bomForPdf,
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

    // 💥 Garante que version enviado pelo frontend será ignorado
    const totalCost = dto.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitCost),
      0
    );
  
    const unitCost = dto.lotSize > 0 ? Number(totalCost / dto.lotSize) : 0;
  
    return db.$transaction(async (tx) => {
      // 1️⃣ Pegar versões existentes
      const existing = await tx.bom_headers.findMany({
        where: {
          tenant_id: tenant,
          product_code: dto.productCode,
        },
        select: { version: true },
      });
  
      // 2️⃣ Calcular a próxima versão
      const nextVersion = this.getNextVersion(existing.map(v => v.version));
  
      // 3️⃣ Criar novo header
      const header = await tx.bom_headers.create({
        data: {
          tenant_id: tenant,
          product_code: dto.productCode,
          version: nextVersion,
          lot_size: dto.lotSize,
          validity_days: dto.validityDays,
          margin_target: dto.marginTarget,
          margin_achieved: dto.marginAchieved,
          total_cost: totalCost,
          unit_cost: unitCost,
          notes: dto.notes ?? null,
        },
      });
  
      // 4️⃣ Criar itens
      const items = dto.items.map((item, index) => ({
        bom_id: header.id,
        line_number: index + 1,
        component_code: item.componentCode,
        description: item.description,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unitCost),
      }));
  
      await tx.bom_items.createMany({ data: items });
  
      return {
        id: header.id,
        version: nextVersion,
        message: "BOM criado com auto-versionamento simples.",
      };
    });
  }
  

  private parseVersion(v: string) {
    const [major, minor] = v.split(".").map(Number);
    return { major, minor };
  }
  
  private buildVersion(major: number, minor: number) {
    return `${major}.${minor}`;
  }
  
  /**
   * 🔥 Auto-versionamento simples:
   * - Primeira versão → 1.0
   * - Demais → incrementa minor
   */
  private getNextVersion(existingVersions: string[]) {
    if (!existingVersions || existingVersions.length === 0) {
      return "1.0";
    }
  
    const parsed = existingVersions
      .map(v => this.parseVersion(v))
      .sort((a, b) =>
        a.major === b.major
          ? b.minor - a.minor
          : b.major - a.major
      );
  
    const last = parsed[0];
    return this.buildVersion(last.major, last.minor + 1);
  }
  

  async updateBom(tenant: string, id: string, dto: UpdateBomDto) {
    const db = await this.prisma(tenant);

    const existing = await db.bom_headers.findFirst({
      where: { id, tenant_id: tenant },
      include: { bom_items: true },
    });

    if (!existing)
      throw new NotFoundException(`BOM '${id}' não encontrado.`);

    const items = dto.items
      ? dto.items.map(i => ({
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        }))
      : existing.bom_items.map(i => ({
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
        include: { bom_items: { orderBy: { line_number: 'asc' } } },
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


    const externalCode =
      dto.external_code && dto.external_code.trim().length > 0
        ? dto.external_code.trim()
        : randomUUID();

    const rawMaterials =
      dto.raw_materials?.length && dto.raw_materials.length > 0
        ? dto.raw_materials.map((item) => ({
            component_code: item.component_code,
            description: this.normalizeNullableString(item.description),
            quantity_used: item.quantity_used,
            unit: item.unit,
            unit_cost:
              item.unit_cost !== undefined && item.unit_cost !== null
                ? Number(item.unit_cost)
                : null,
            warehouse: this.normalizeNullableString(item.warehouse),
            batch_number: this.normalizeNullableString(item.batch_number),
            ...(item.consumed_at && {
              consumed_at: new Date(item.consumed_at),
            }),
          }))
        : undefined;

    try {
      return db.production_orders.create({
        data: {
          external_code: externalCode,
          product_code: dto.product_code,
          quantity_planned: dto.quantity_planned,
          unit: dto.unit,
          OP: dto.OP,
          start_date: new Date(dto.start_date),
          due_date: new Date(dto.due_date),
          notes: this.normalizeNullableString(dto.notes) ?? null,
          ...(dto.author_user ? { author_user: dto.author_user } : {}),
          ...(dto.ingredients != null ? { ingredients: Number(dto.ingredients) } : {}),
          ...(dto.labor != null ? { labor: Number(dto.labor) } : {}),
          ...(dto.packaging != null ? { packaging: Number(dto.packaging) } : {}),
          ...(dto.taxes != null ? { taxes: Number(dto.taxes) } : {}),
          ...(dto.Overhead != null ? { overhead: Number(dto.Overhead) } : {}),
          ...(dto.totalCost != null ? { totalCost: Number(dto.totalCost) } : {}),
          ...(dto.unitCost != null ? { unitCost: Number(dto.unitCost) } : {}),
          ...(dto.lote != null ? { lote: dto.lote } : {}),
          ...(dto.validate ? { validate: new Date(dto.validate) } : {}),
          ...(dto.custom_validate_date
            ? { custom_validate_date: new Date(dto.custom_validate_date) }
            : {}),
          ...(dto.boxes_qty != null ? { boxes_qty: dto.boxes_qty } : {}),
          ...(dto.box_cost != null ? { box_cost: Number(dto.box_cost) } : {}),
          ...(dto.labor_per_unit != null
            ? { labor_per_unit: Number(dto.labor_per_unit) }
            : {}),
          ...(dto.sale_price != null ? { sale_price: Number(dto.sale_price) } : {}),
          ...(dto.markup != null ? { markup: Number(dto.markup) } : {}),
          ...(dto.post_sale_tax != null
            ? { post_sale_tax: Number(dto.post_sale_tax) }
            : {}),
          ...(rawMaterials?.length
            ? {
                raw_materials: {
                  create: rawMaterials,
                },
              }
            : {}),
          statuses: {
            create: {
              status: this.defaultOrderStatus,
              responsible: this.systemStatusResponsible,
              remarks: null,
            },
          },
        },
        select: this.buildOrderSelect({
          statuses: true,
          rawMaterials: true,
        }),
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
      select: this.buildOrderSelect(),
    });
  }

  async getOrder(tenant: string, id: string) {
    const db = await this.prisma(tenant);

    const order = await db.production_orders.findUnique({
      where: { id },
      select: this.buildOrderSelect({
        statuses: true,
        finishedGoods: true,
        rawMaterials: true,
      }),
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
          notes:
            dto.notes !== undefined
              ? this.normalizeNullableString(dto.notes)
              : exists.notes,
          ...(dto.lote !== undefined ? { lote: dto.lote } : {}),
          ...(dto.validate !== undefined
            ? dto.validate
              ? { validate: new Date(dto.validate) }
              : { validate: null }
            : {}),
          ...(dto.custom_validate_date !== undefined
            ? dto.custom_validate_date
              ? { custom_validate_date: new Date(dto.custom_validate_date) }
              : { custom_validate_date: null }
            : {}),
          ...(dto.boxes_qty !== undefined ? { boxes_qty: dto.boxes_qty } : {}),
          ...(dto.box_cost !== undefined
            ? dto.box_cost != null
              ? { box_cost: Number(dto.box_cost) }
              : { box_cost: null }
            : {}),
          ...(dto.labor_per_unit !== undefined
            ? dto.labor_per_unit != null
              ? { labor_per_unit: Number(dto.labor_per_unit) }
              : { labor_per_unit: null }
            : {}),
          ...(dto.sale_price !== undefined
            ? dto.sale_price != null
              ? { sale_price: Number(dto.sale_price) }
              : { sale_price: null }
            : {}),
          ...(dto.markup !== undefined
            ? dto.markup != null
              ? { markup: Number(dto.markup) }
              : { markup: null }
            : {}),
          ...(dto.post_sale_tax !== undefined
            ? dto.post_sale_tax != null
              ? { post_sale_tax: Number(dto.post_sale_tax) }
              : { post_sale_tax: null }
            : {}),
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

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed?.length ? trimmed : null;
  }
}
