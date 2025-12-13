import {
  Injectable,
  BadRequestException,
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
import { InventoryService } from '../inventory/inventory.service';

import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';

import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';

import { RegisterOrderStatusDto } from './dto/register-order-status.dto';
import { RecordFinishedGoodDto } from './dto/record-finished-good.dto';
import { RecordRawMaterialDto } from './dto/record-raw-material.dto';
import { FindProductionOrdersQueryDto } from './dto/find-production-orders.dto';
import { IssueRawMaterialsDto } from './dto/issue-raw-materials.dto';
import { CompleteProductionOrderDto } from './dto/complete-production-order.dto';
import { TFormulasService } from '../t_formulas/t_formulas.service';

@Injectable()
export class ProductionService {
  private readonly defaultOrderStatus = 'PENDENTE';
  private readonly systemStatusResponsible = 'SISTEMA';
  private readonly formulaCompanyCache = new Map<string, number>();

  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly bomPdfService: BomPdfService,
    private readonly inventoryService: InventoryService,
    private readonly tFormulasService: TFormulasService,
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
      base.statuses = { orderBy: [{ event_time: 'desc' }, { id: 'desc' }] };
    }

    if (options?.finishedGoods) {
      base.finished_goods = { orderBy: { posted_at: 'desc' } };
    }

    if (options?.rawMaterials) {
      base.raw_materials = {
        orderBy: { consumed_at: 'desc' },
        select: {
          id: true,
          component_code: true,
          description: true,
          quantity_used: true,
          unit: true,
          unit_cost: true,
          warehouse: true,       // ✅ AQUI ESTÁ O PONTO
          batch_number: true,
          consumed_at: true,
        },
      };
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
      take: 50,
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
    const db = await this.prisma(tenant);

    const latestBomHeader = await db.bom_headers.findFirst({
      where: {
        tenant_id: tenant,
        product_code: productCode,
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (latestBomHeader) {
      const latestBomId = latestBomHeader.id;

      const bomDetails = await db.bom_headers.findUnique({
        where: {
          id: latestBomId,
        },
        include: {
          bom_items: {
            orderBy: {
              line_number: 'asc',
            },
          },
        },
      });

      if (bomDetails) {
        return bomDetails;
      }
    }

    // Caso nao haja BOM, busca na tabela legada T_FORMULAS usando cditem.
    const cditem = Number(productCode);

    if (!Number.isFinite(cditem)) {
      throw new NotFoundException(
        `Nenhuma formula/BOM encontrada para o produto '${productCode}'.`,
      );
    }

    const legacyFormulas = await this.tFormulasService.findAll(tenant, {
      cditem,
    });

    return {
      source: 't_formulas',
      cditem,
      formulas: legacyFormulas,
    };
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
      // 1️⃣ Pegar versões existentes e a última BOM para comparar
      const [existingVersions, latestBom] = await Promise.all([
        tx.bom_headers.findMany({
          where: {
            tenant_id: tenant,
            product_code: dto.productCode,
          },
          select: { version: true },
        }),
        tx.bom_headers.findFirst({
          where: {
            tenant_id: tenant,
            product_code: dto.productCode,
          },
          include: {
            bom_items: { orderBy: { line_number: 'asc' } },
          },
          orderBy: [{ created_at: 'desc' }],
        }),
      ]);

      const normalizeItems = (
        items: Array<{
          component_code: string;
          quantity: number;
          unit_cost: number;
        }>,
      ) =>
        [...items]
          .map((i) => ({
            component_code: i.component_code,
            quantity: Number(i.quantity),
            unit_cost: Number(i.unit_cost),
          }))
          .sort((a, b) => a.component_code.localeCompare(b.component_code));

      const incomingItems = normalizeItems(
        dto.items.map((i) => ({
          component_code: i.componentCode,
          quantity: i.quantity,
          unit_cost: i.unitCost,
        })),
      );

      const latestItems = latestBom
        ? normalizeItems(
            latestBom.bom_items.map((i) => ({
              component_code: i.component_code,
              quantity: Number(i.quantity),
              unit_cost: Number(i.unit_cost),
            })),
          )
        : null;

      const itemsChanged =
        !latestItems ||
        latestItems.length !== incomingItems.length ||
        latestItems.some((item, idx) => {
          const other = incomingItems[idx];
          return (
            item.component_code !== other.component_code ||
            item.quantity !== other.quantity ||
            item.unit_cost !== other.unit_cost
          );
        });

      if (!itemsChanged && latestBom) {
        return {
          id: latestBom.id,
          version: latestBom.version,
          message: 'BOM mantida (itens inalterados).',
        };
      }

      // 2️⃣ Calcular a próxima versão
      const nextVersion = this.getNextVersion(
        existingVersions.map((v) => v.version),
      );
  
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
        message: "BOM criada (nova versão após alteração de itens).",
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

  private async getFormulaCompanyId(
      tenant: string,
      prisma: Omit<TenantClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
    ): Promise<number> {
    const cached = this.formulaCompanyCache.get(tenant);
    if (cached) return cached;

    const firstFormula = await prisma.t_formulas.findFirst({
      select: { cdemp: true },
      orderBy: { autocod: 'asc' },
    });

    const cdemp = firstFormula?.cdemp ?? 1;
    this.formulaCompanyCache.set(tenant, cdemp);
    return cdemp;
  }

  private async ensureLegacyFormula(
      tenant: string,
      prisma: Omit<TenantClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
      productCode: string,
      rawMaterials: Array<{
        component_code: string;
        description: string | null;
        quantity_used: number;
        unit: string;
      }>,
    ) {
    const cditem = Number(productCode);
    if (!Number.isFinite(cditem)) {
      return;
    }

    const cdemp = await this.getFormulaCompanyId(tenant, prisma);

    const exists = await prisma.t_formulas.findFirst({
      where: { cdemp, cditem },
    });

    if (exists) return;

    const data = rawMaterials
      .map((item) => {
        const matprima = Number(item.component_code);
        if (!Number.isFinite(matprima)) return null;

        return {
          cdemp,
          cditem,
          empitem: cdemp,
          undven: item.unit ?? '',
          matprima,
          qtdemp: item.quantity_used,
          undmp: item.unit ?? '',
          empitemmp: cdemp,
          deitem_iv: item.description ?? null,
        } as TenantPrismaTypes.t_formulasCreateManyInput;
      })
      .filter((i): i is TenantPrismaTypes.t_formulasCreateManyInput => Boolean(i));

    if (!data.length) return;

    await prisma.t_formulas.createMany({ data });
  }

  private async ensureBomFromOrder(
    tenant: string,
    prisma: Omit<TenantClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
    productCode: string,
    rawMaterials: Array<{
      component_code: string;
      description: string | null;
      quantity_used: number;
      unit_cost?: number;
    }>,
    lotSize: number,
    totalCost: number,
    unitCost: number,
    notes?: string | null,
  ) {
    const existing = await prisma.bom_headers.findFirst({
      where: { tenant_id: tenant, product_code: productCode },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const header = await prisma.bom_headers.create({
      data: {
        tenant_id: tenant,
        product_code: productCode,
        version: '1.0',
        lot_size: lotSize,
        validity_days: 0,
        margin_target: 0,
        margin_achieved: 0,
        total_cost: totalCost,
        unit_cost: unitCost,
        notes: notes ?? null,
      },
    });

    if (rawMaterials.length) {
      const items = rawMaterials.map((item, index) => ({
        bom_id: header.id,
        line_number: index + 1,
        component_code: item.component_code,
        description: item.description,
        quantity: Number(item.quantity_used),
        unit_cost: Number(item.unit_cost ?? 0),
      }));

      await prisma.bom_items.createMany({ data: items });
    }

    return header.id;
  }

  //
  // --------------------------------------------------------------------------
  //  PRODUCTION ORDERS
  // --------------------------------------------------------------------------
  //
  
  async createOrder(tenant: string, dto: CreateProductionOrderDto) {
    const db = await this.prisma(tenant);
  
    const externalCode =
      dto.external_code?.trim() || randomUUID();
  
    // ---- calcular ingredientes ----
    const ingredients = dto.raw_materials.reduce(
      (sum, item) => sum + item.quantity_used * (item.unit_cost ?? 0),
      0,
    );
  
    const labor = dto.labor_per_unit * dto.quantity_planned;
  
    const packaging = (dto.box_cost ?? 0) * (dto.boxes_qty ?? 0);
  
    const taxes = dto.post_sale_tax ?? 0;
  
    //const totalCost = ingredients + labor + packaging + taxes;
    const totalCost = ingredients + labor + packaging;
  
    const unitCost =
      dto.quantity_planned > 0
        ? totalCost / dto.quantity_planned
        : 0;

    // console.log(JSON.stringify(dto.raw_materials, null, 2));
    
    const rawMaterialsToInsert = dto.raw_materials.map((item) => ({
      component_code: item.component_code,
      description: item.description ?? null,
      quantity_used: item.quantity_used,
      unit: item.unit ?? dto.unit, // fallback para unidade da OP
      unit_cost: item.unit_cost,
      warehouse: item.warehouse ?? null,
    }));
  
    const { order: created } = await db.$transaction(async (tx) => {
      const order = await tx.production_orders.create({
        data: {
          external_code: externalCode,
          product_code: dto.product_code,
          quantity_planned: dto.quantity_planned,
          unit: dto.unit,
          start_date: new Date(dto.start_date),
          due_date: new Date(dto.due_date),
          notes: dto.notes ?? null,
          lote: dto.lote ?? null,
          validate: dto.validate ? new Date(dto.validate) : null,
          custom_validate_date: dto.custom_validate_date
            ? new Date(dto.custom_validate_date)
            : null,
          bom_header_id: dto.bom_id ?? undefined,

          boxes_qty: dto.boxes_qty ?? 0,
          box_cost: dto.box_cost ?? 0,
          labor_per_unit: dto.labor_per_unit ?? 0,
          sale_price: dto.sale_price ?? null,
          markup: dto.markup ?? 0,
          post_sale_tax: dto.post_sale_tax ?? 0,
          author_user: dto.author_user ?? "Desconhecido",
    
          // ---- calculados automaticamente ----
          ingredients,
          labor,
          packaging,
          taxes,
          totalCost,
          unitCost,
    
          raw_materials: {
            create: rawMaterialsToInsert,
          },

          statuses: {
            create: {
              status: this.defaultOrderStatus,
              responsible: this.systemStatusResponsible,
              status_user: dto.author_user ?? "Desconhecido",
            },
          },
        },
    
        select: this.buildOrderSelect({
          rawMaterials: true,
          statuses: true,
        }),
      });

      await this.ensureLegacyFormula(
        tenant,
        tx,
        order.product_code,
        rawMaterialsToInsert,
      );

      const bomId = await this.ensureBomFromOrder(
        tenant,
        tx,
        order.product_code,
        rawMaterialsToInsert,
        dto.quantity_planned,
        totalCost,
        unitCost,
        dto.notes ?? null,
      );

      if (!order.bom_header_id && bomId) {
        const updatedOrder = await tx.production_orders.update({
          where: { id: order.id },
          data: { bom_header_id: bomId },
          select: this.buildOrderSelect({
            rawMaterials: true,
            statuses: true,
          }),
        });

        return { order: updatedOrder };
      }

      return { order };
    });

    const latestStatus = created.statuses?.[0]?.status ?? null;
    const productName = await this.getProductDescription(
      tenant,
      created.product_code,
    );
    return {
      ...created,
      productName,
      current_status: latestStatus,
      status: latestStatus ?? (created as any).status,
      statusHistory: created.statuses ?? [],
    };
  }
  
 
  async findOrders(
    tenant: string,
    query: FindProductionOrdersQueryDto,
  ) {
    const db = await this.prisma(tenant);

    console.log('Finding orders with query:', query); 
    
    const orders = await db.production_orders.findMany({
      where: {
        ...(query.external_code && {
          external_code: query.external_code,
        }),
        ...(query.product_code && {
          product_code: query.product_code,
        }),
      },
      take: 50,
      orderBy: { created_at: 'desc' },
      select: this.buildOrderSelect({ rawMaterials: true, statuses: true }),
    });

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const latestStatus = order.statuses?.[0]?.status ?? null;
        const productName = await this.getProductDescription(
          tenant,
          order.product_code,
        );

        return {
          ...order,
          productName,
          current_status: latestStatus,
          status: latestStatus ?? (order as any).status,
          statusHistory: order.statuses ?? [],
        };
      }),
    );

    return enriched;
  }

  async getOrder(tenant: string, idOrOp: string) {
    const db = await this.prisma(tenant);

     console.log('Getting order for ID/OP:', idOrOp);

    const asNumber = Number(idOrOp);
    const byOp = Number.isFinite(asNumber);

    const order = await db.production_orders.findFirst({
      where: byOp ? { OP: asNumber } : { id: idOrOp },
      select: this.buildOrderSelect({
        statuses: true,
        finishedGoods: true,
        rawMaterials: true,
      }),
    });

    if (!order)
      throw new NotFoundException(
        `Ordem '${idOrOp}' não encontrada (${byOp ? 'OP' : 'UUID'}).`,
      );

    const latestStatus = order.statuses?.[0]?.status ?? null;
    const productName = await this.getProductDescription(
      tenant,
      order.product_code,
    );

    return {
      ...order,
      productName,
      batchNumber: order.lote ?? null,
      production_unit_cost: (order as any).unitCost ?? null,
      production_total_cost: (order as any).totalCost ?? null,
      current_status: latestStatus,
      status: latestStatus ?? (order as any).status,
      statusHistory: order.statuses ?? [],
    };
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
        status_user: dto.status_user ?? null,
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
  //  PRODUCTION WORKFLOW
  // --------------------------------------------------------------------------
  //

  async issueRawMaterials(
    tenant: string,
    id: string,
    dto: IssueRawMaterialsDto,
  ) {
    const db = await this.prisma(tenant);

    const order = await db.production_orders.findUnique({
      where: { id },
    });

    if (!order)
      throw new NotFoundException(`Ordem '${id}' nÇœo encontrada.`);

    if (!dto.raw_materials?.length) {
      throw new BadRequestException(
        'Informe ao menos uma matÇ½ria-prima para baixa.',
      );
    }

    const userCode = this.resolveUserCode(dto.user, order.author_user);
    const responsible = dto.responsible ?? this.systemStatusResponsible;
    const orderDocumentDate =
      order.start_date ?? order.due_date ?? order.created_at ?? new Date();
    const orderNumber = order.OP;

    const movements: Array<{
      component_code: string;
      movement: {
        id: number;
        itemId: number;
        type: "E" | "S";
        quantity: number;
        unitPrice: number | null;
        totalValue: number | null;
        previousBalance: number;
        currentBalance: number;
        date: Date | null;
      };
      warehouse: string;
    }> = [];

    for (const [index, material] of dto.raw_materials.entries()) {
      const warehouse =
        (material.warehouse ?? dto.warehouse)?.toString().trim() || '';

      if (!warehouse) {
        throw new BadRequestException(
          `Warehouse nÇœo informado para a matÇ½ria-prima na posiÇõÇœ ${
            index + 1
          }.`,
        );
      }

      const quantity = Number(material.quantity_used);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Quantidade invÇ­lida para a matÇ½ria-prima '${material.component_code}'.`,
        );
      }

      const componentCode = material.component_code?.trim();
      if (!componentCode) {
        throw new BadRequestException(
          'CÇodigo da matÇ½ria-prima nÇœo informado.',
        );
      }

      const item = await this.findItemForMovement(db, componentCode);
      const consumedAt = material.consumed_at ?? new Date().toISOString();
      const unitCost = material.unit_cost ?? material.unit_price;
      const totalValue =
        material.value != null && material.value !== undefined
          ? material.value
          : unitCost != null
            ? unitCost * quantity
            : undefined;

      const movement = await this.inventoryService.createMovement(tenant, {
        itemId: item.ID as string,
        type: 'S',
        quantity,
        unitPrice: unitCost ?? undefined,
        totalValue,
        cost: unitCost ?? undefined,
        document: {
          type: 'P',
          number: orderNumber,
          date: orderDocumentDate.toISOString(),
        },
        notes: material.description ?? dto.notes ?? undefined,
        warehouse,
        customerOrSupplier: 1,
        date: consumedAt,
        user: userCode,
      });

      movements.push({
        component_code: componentCode,
        movement,
        warehouse,
      });
    }

    await db.production_order_status.create({
      data: {
        order_id: id,
        status: 'PRODUCAO',
        responsible,
        remarks: dto.notes ?? null,
        status_user: userCode,
      },
    });

    return {
      order_id: id,
      status: 'PRODUCAO',
      movements,
    };
  }

  async completeOrder(
    tenant: string,
    id: string,
    dto: CompleteProductionOrderDto,
  ) {
    const db = await this.prisma(tenant);

    const order = await db.production_orders.findUnique({
      where: { id },
    });

    if (!order)
      throw new NotFoundException(`Ordem '${id}' nÇœo encontrada.`);

    const productCode = dto.product_code?.trim() || order.product_code?.trim();
    if (!productCode) {
      throw new BadRequestException(
        'Produto produzido nÇœo informado para conclusÇœo.',
      );
    }

    const quantity = Number(dto.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(
        'Quantidade produzida deve ser maior que zero.',
      );
    }

    const userCode = this.resolveUserCode(dto.user, order.author_user);
    const responsible = dto.responsible ?? this.systemStatusResponsible;
    const item = await this.findItemForMovement(db, productCode);
    const postedAt = dto.posted_at ?? new Date().toISOString();

    const movement = await this.inventoryService.createMovement(tenant, {
      itemId: item.ID as string,
      type: 'E',
      quantity,
      unitPrice: dto.unit_cost,
      document: { type: 'P' },
      notes: dto.notes ?? undefined,
      warehouse: dto.warehouse,
      customerOrSupplier: 1,
      date: postedAt,
      user: userCode,
    });

    await db.order_finished_goods.create({
      data: {
        order_id: id,
        product_code: productCode,
        lot_number: dto.lot_number ?? null,
        quantity_good: quantity,
        quantity_scrap: 0,
        unit_cost: dto.unit_cost ?? null,
        ...(dto.posted_at ? { posted_at: new Date(dto.posted_at) } : {}),
      },
    });

    await db.production_order_status.create({
      data: {
        order_id: id,
        status: 'CONCLUIDA',
        responsible,
        remarks: dto.notes ?? null,
        status_user: userCode,
      },
    });

    return {
      order_id: id,
      status: 'CONCLUIDA',
      movement,
    };
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

  private resolveUserCode(user?: string | null, fallback?: string | null) {
    return user?.trim() || fallback?.trim() || this.systemStatusResponsible;
  }

  private isGuid(value: string) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(
      value,
    );
  }

  private async findItemForMovement(
    prisma: TenantClient,
    code: string,
  ) {
    const normalized = code?.trim();
    if (!normalized) {
      throw new BadRequestException('CÇodigo do item nÇœo informado.');
    }

    const numericCode = Number(normalized);
    const search: TenantPrismaTypes.t_itensWhereInput[] = [
      { deitem: normalized },
    ];

    if (this.isGuid(normalized)) {
      search.unshift({ ID: normalized });
    }

    if (!Number.isNaN(numericCode)) {
      search.unshift({ cditem: numericCode });
    }

    const item = await prisma.t_itens.findFirst({
      where: {
        OR: search,
        NOT: { isdeleted: true },
      },
      select: { ID: true, cditem: true, deitem: true },
    });

    if (!item?.ID) {
      throw new NotFoundException(`Item '${code}' nÇœo encontrado.`);
    }

    return item;
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
