import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma as PrismaTypes } from '../../prisma/generated/client_tenant';
import type { TenantClient } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { MovementFiltersDto } from './dto/movement-filters.dto';
import { MovementSummaryQueryDto } from './dto/movement-summary-query.dto';
import { KardexQueryDto } from './dto/kardex-query.dto';
import { CreateMovementDto } from './dto/create-movement.dto';

@Injectable()
export class InventoryService {
  private readonly defaultCompanyId = 1;
  private readonly companyCache = new Map<string, number>();

  constructor(private readonly tenantDb: TenantDbService) {}

  private async prisma(tenant: string): Promise<TenantClient> {
    return this.tenantDb.getTenantClient(tenant);
  }

  private async getCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.companyCache.get(tenant);
    if (cached) {
      return cached;
    }

    const company = await prisma.t_emp.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    const cdemp = company?.cdemp ?? this.defaultCompanyId;
    this.companyCache.set(tenant, cdemp);
    return cdemp;
  }

  private normalizeType(type?: string | null): 'E' | 'S' {
    return type?.trim().toUpperCase() === 'S' ? 'S' : 'E';
  }

  private isGuid(value: string) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  }

  private normalizeEndDateString(value?: string) {
    if (!value) return value;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Se a string já tiver hora, não acrescenta.
    const hasTime = /[T\s]\d{1,2}:\d{2}/.test(trimmed);
    return hasTime ? trimmed : `${trimmed} 23:59:59`;
  }

  private parseDateRange(from?: string, to?: string) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (from) {
      start = new Date(from);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Parametro "from" invalido.');
      }
    }

    if (to) {
      end = new Date(to);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Parametro "to" invalido.');
      }
      end.setHours(23, 59, 59, 999);
    }

    if (start && end && start > end) {
      throw new BadRequestException(
        'O intervalo de datas esta invalido (from apos to).',
      );
    }

    return { start, end };
  }

  private buildDateFilter(
    start?: Date,
    end?: Date,
  ): PrismaTypes.DateTimeNullableFilter<'t_movest'> | undefined {
    if (!start && !end) {
      return undefined;
    }

    const filter: PrismaTypes.DateTimeNullableFilter<'t_movest'> = {};
    if (start) filter.gte = start;
    if (end) filter.lte = end;
    return filter;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numeric =
      typeof value === 'object' && (value as any)?.valueOf
        ? Number((value as any).valueOf())
        : Number(value);

    if (Number.isNaN(numeric)) {
      return null;
    }

    return numeric;
  }

  private toNumber(value: unknown): number {
    return this.toOptionalNumber(value) ?? 0;
  }

  private withFallback(value: unknown, fallback: number): number {
    const parsed = this.toOptionalNumber(value);
    return parsed ?? fallback;
  }

  private applySignedQuantity(type: string | null | undefined, quantity: number) {
    const sign = this.normalizeType(type) === 'S' ? -1 : 1;
    return quantity * sign;
  }

  private async getStartingBalance(
    prisma: TenantClient,
    cdemp: number,
    cditem: number,
    before?: Date,
  ): Promise<number> {
    if (!before) {
      return 0;
    }

    const previous = await prisma.t_movest.findFirst({
      where: {
        cdemp,
        cditem,
        isdeleted: false,
        data: { lt: before },
      },
      orderBy: [{ data: 'desc' }, { nrlan: 'desc' }],
      select: {
        saldoant: true,
        qtde: true,
        st: true,
        sldantemp: true,
      },
    });

    if (!previous) {
      return 0;
    }

    const cachedBalance = this.toOptionalNumber(previous.sldantemp);
    if (cachedBalance !== null) {
      return cachedBalance;
    }

    const saldoAnt = this.toOptionalNumber(previous.saldoant) ?? 0;
    const qty = this.toNumber(previous.qtde);
    return saldoAnt + this.applySignedQuantity(previous.st, qty);
  }

  private computeTotalValue(quantity: number, unitPrice?: number | null) {
    if (unitPrice === null || unitPrice === undefined) {
      return null;
    }
    return quantity * unitPrice;
  }

  async getKardex(
    tenant: string,
    itemId: number,
    query: KardexQueryDto,
  ) {
    const prisma = await this.prisma(tenant);
    const cdemp =
      this.toOptionalNumber(query.cdemp) ??
      (await this.getCompanyId(tenant, prisma));
    const { start, end } = this.parseDateRange(
      query.from,
      this.normalizeEndDateString(query.to),
    );

    const startingBalance = await this.getStartingBalance(
      prisma,
      cdemp,
      itemId,
      start,
    );


    const where: PrismaTypes.t_movestWhereInput = {
      cdemp: { equals: cdemp },
      cditem: { equals: itemId },
      isdeleted: { equals: false },
    };

    const dateFilter = this.buildDateFilter(start, end);
    if (dateFilter) {
      where.data = dateFilter;
    }

    const movements = await prisma.t_movest.findMany({
      where,
      orderBy: [{ data: 'asc' }, { nrlan: 'asc' }],
    });

    let runningBalance = startingBalance;

    return movements.map((movement) => {
      const quantity = this.toNumber(movement.qtde);
      const previousBalance = this.withFallback(
        movement.saldoant,
        runningBalance,
      );
      const signedQty = this.applySignedQuantity(movement.st, quantity);
      const currentBalance =
        this.toOptionalNumber(movement.sldantemp) ??
        previousBalance + signedQty;
      runningBalance = currentBalance;

      return {
        nrlan: movement.nrlan,
        date: movement.data ?? movement.datadoc ?? null,
        docNumber: movement.numdoc ?? null,
        type: this.normalizeType(movement.st),
        quantity,
        unitPrice: this.toOptionalNumber(movement.preco),
        totalValue: this.toOptionalNumber(movement.valor),
        previousBalance,
        currentBalance,
        notes: movement.obs ?? null,
      };
    });
  }

  async listMovements(tenant: string, filters: MovementFiltersDto) {
    const prisma = await this.prisma(tenant);
    const type = this.normalizeType(filters.type);
    const { start, end } = this.parseDateRange(
      filters.from,
      this.normalizeEndDateString(filters.to),
    );
    const itemCode = this.toOptionalNumber(filters.itemId);
    const cdemp =
      this.toOptionalNumber(filters.cdemp) ??
      (await this.getCompanyId(tenant, prisma));

    const where: PrismaTypes.t_movestWhereInput = {
      cdemp: { equals: cdemp },
      st: { equals: type },
      isdeleted: { equals: false },
      ...(itemCode !== null ? { cditem: { equals: itemCode } } : {}),
    };

    const dateFilter = this.buildDateFilter(start, end);
    if (dateFilter) {
      where.data = dateFilter;
    }

    const movements = await prisma.t_movest.findMany({
      where,
      // Limita a resposta a 50 registros
      take: 50,
      orderBy: [{ data: 'desc' }, { nrlan: 'desc' }],
    });

    const itemIds = Array.from(
      new Set(
        movements
          .map((movement) => this.toOptionalNumber(movement.cditem))
          .filter((cditem): cditem is number => cditem !== null),
      ),
    );

    const items = itemIds.length
      ? await prisma.t_itens.findMany({
          where: { cdemp, cditem: { in: itemIds } },
          select: { cditem: true, deitem: true },
        })
      : [];

    const itemDescriptions = new Map(
      items.map((item) => [item.cditem, item.deitem ?? null]),
    );

    const missingItemIds = itemIds.filter((id) => !itemDescriptions.has(id));
    if (missingItemIds.length) {
      const fallbackItems = await prisma.t_itens.findMany({
        where: { cditem: { in: missingItemIds } },
        select: { cditem: true, deitem: true },
      });
      for (const item of fallbackItems) {
        if (!itemDescriptions.has(item.cditem)) {
          itemDescriptions.set(item.cditem, item.deitem ?? null);
        }
      }
    }

    return movements.map((movement) => {
      const quantity = this.toNumber(movement.qtde);
      const unitPrice = this.toOptionalNumber(movement.preco);
      const totalValue =
        this.toOptionalNumber(movement.valor) ??
        this.computeTotalValue(quantity, unitPrice);
      const cditemValue = this.toOptionalNumber(movement.cditem);
      const description =
        cditemValue !== null ? itemDescriptions.get(cditemValue) ?? null : null;

      return {
        nrlan: movement.nrlan,
        itemId: movement.cditem ?? null,
        itemCode: cditemValue !== null ? cditemValue.toString() : null,
        itemDescription: description,
        itemLabel: description,
        date: movement.data ?? movement.datadoc ?? null,
        type,
        quantity,
        unitPrice,
        totalValue,
        document: {
          number: movement.numdoc ?? null,
          date: movement.datadoc ?? movement.data ?? null,
          type: movement.especie ?? null,
        },
        counterparty: movement.clifor
          ? {
              code: movement.clifor,
              type: type === 'E' ? 'FORNECEDOR' : 'CLIENTE',
            }
          : null,
        notes: movement.obs ?? null,
        warehouse: movement.empitem ?? null,
      };
    });
  }

  async getSummary(tenant: string, query: MovementSummaryQueryDto) {
    const prisma = await this.prisma(tenant);
    const { start, end } = this.parseDateRange(
      query.from,
      this.normalizeEndDateString(query.to),
    );
    const itemCode = this.toOptionalNumber(query.itemId);
    const cdemp =
      this.toOptionalNumber(query.cdemp) ??
      (await this.getCompanyId(tenant, prisma));
    let itemDescription: string | null = null;

    if (itemCode !== null) {
      const item = await prisma.t_itens.findFirst({
        where: { cdemp, cditem: itemCode },
        select: { deitem: true },
      });

      if (item?.deitem) {
        itemDescription = item.deitem;
      } else {
        const fallback = await prisma.t_itens.findFirst({
          where: { cditem: itemCode },
          select: { deitem: true },
        });
        itemDescription = fallback?.deitem ?? null;
      }
    }

    if (!start || !end) {
      throw new BadRequestException('Parametros "from" e "to" sao obrigatorios.');
    }

    const where: PrismaTypes.t_movestWhereInput = {
      cdemp: { equals: cdemp },
      isdeleted: { equals: false },
      ...(itemCode !== null ? { cditem: { equals: itemCode } } : {}),
    };

    const dateFilter = this.buildDateFilter(start, end);
    if (dateFilter) {
      where.data = dateFilter;
    }

    const movements = await prisma.t_movest.findMany({
      where,
      orderBy: [{ data: 'asc' }, { nrlan: 'asc' }],
    });

    let entriesQty = 0;
    let entriesValue = 0;
    let exitsQty = 0;
    let exitsValue = 0;

    for (const movement of movements) {
      const qty = this.toNumber(movement.qtde);
      const val = this.toOptionalNumber(movement.valor) ?? 0;
      if (this.normalizeType(movement.st) === 'S') {
        exitsQty += qty;
        exitsValue += val;
      } else {
        entriesQty += qty;
        entriesValue += val;
      }
    }

    const netQuantity = entriesQty - exitsQty;
    const startingBalance =
      itemCode !== null
        ? await this.getStartingBalance(prisma, cdemp, itemCode, start)
        : 0;

    return {
      itemId: itemCode ?? null,
      itemDescription,
      itemLabel: itemDescription,
      from: query.from,
      to: query.to,
      entries: {
        quantity: entriesQty,
        value: entriesValue,
      },
      exits: {
        quantity: exitsQty,
        value: exitsValue,
      },
      netQuantity,
      currentBalance: startingBalance + netQuantity,
    };
  }

  async createMovement(tenant: string, dto: CreateMovementDto) {
    const prisma = await this.prisma(tenant);

    // validacao de campos obrigatorios (payload)
    const userCode = dto.codusu?.trim() || dto.user?.trim();
    const missingFields: string[] = [];
    if (!dto.warehouse?.trim()) missingFields.push('cdemp (warehouse)');
    if (!dto.itemId?.trim()) missingFields.push('cditem (itemId)');
    if (dto.customerOrSupplier === undefined || dto.customerOrSupplier === null)
      missingFields.push('clifor (customerOrSupplier)');
    if (!dto.date) missingFields.push('data (date)');
    if (dto.quantity === undefined || dto.quantity === null)
      missingFields.push('qtde (quantity)');
    if (!dto.type) missingFields.push('st (type)');
    if (!userCode) missingFields.push('codusu (user)');

    if (missingFields.length) {
      throw new BadRequestException(`Campos obrigatorios ausentes no payload: ${missingFields.join(', ')}.`);
    }

    // 1ï¸âƒ£ Data do movimento
    const movementDate = dto.date ? new Date(dto.date) : new Date();
    if (isNaN(movementDate.getTime())) {
      throw new BadRequestException('Data do lanÃ§amento invÃ¡lida.');
    }
  
    // 2ï¸âƒ£ NormalizaÃ§Ã£o e cÃ¡lculos bÃ¡sicos
    const type = this.normalizeType(dto.type);
    const quantity = Math.abs(dto.quantity);
    const signedQty = this.applySignedQuantity(type, quantity);
    const unitPrice = dto.unitPrice ?? null;
    const totalValue =
      dto.totalValue != null
        ? dto.totalValue
        : this.computeTotalValue(quantity, unitPrice);
    const cost = dto.cost ?? dto.unitPrice ?? null;

    // 3 - Buscar empresa selecionada (aceita GUID do ID ou cdemp numerico)
    const warehouseInput = dto.warehouse?.trim();
    let empresa;
    let warehouseLabel = warehouseInput ?? '';

    if (warehouseInput) {
      let whereCompany:
        | { ID: string }
        | { cdemp: number }
        | null = null;

      if (this.isGuid(warehouseInput)) {
        whereCompany = { ID: warehouseInput };
      } else {
        const cdempParsed = Number(warehouseInput);
        if (!Number.isNaN(cdempParsed)) {
          whereCompany = { cdemp: cdempParsed };
        }
      }

      if (!whereCompany) {
        throw new BadRequestException(
          'Warehouse invalido. Envie GUID (ID) ou cdemp numerico.',
        );
      }

      empresa = await prisma.t_emp.findFirst({
        where: { ...whereCompany, NOT: { isdeleted: true } },
      });
    } else {
      const defaultCdemp = await this.getCompanyId(tenant, prisma);
      warehouseLabel = defaultCdemp.toString();
      empresa = await prisma.t_emp.findFirst({
        where: { cdemp: defaultCdemp, NOT: { isdeleted: true } },
      });
    }

    // console.log('Empresa selecionada:', empresa);

    if (!empresa) {
      throw new BadRequestException(
        `Empresa/Almoxarifado '${warehouseLabel}' nao encontrada.`,
      );
    }

    const cdemp = empresa.cdemp; // empresa selecionada
    const empmov = empresa.cdemp;
    const empven = empresa.cdemp;

    // 4 - Buscar item pelo GUID dentro do almoxarifado selecionado
    const item = await prisma.t_itens.findFirst({
      where: { ID: dto.itemId, cdemp },
    });

    if (!item) {
      throw new BadRequestException(
        `Item '${dto.itemId}' nao encontrado no almoxarifado '${warehouseLabel}'.`,
      );
    }

    const cditem = item.cditem;   // ok (int)
    const empitem = cdemp;        // almoxarifado do item
    const empfor = cdemp;         // empresa de referencia
    
    // 5ï¸âƒ£ Saldo anterior
    const previousBalance = await this.getStartingBalance(
      prisma,
      cdemp,
      cditem,
      movementDate,
    );
  
    const currentBalance = previousBalance + signedQty;
  
    // 6ï¸âƒ£ Criar movimento
    const created = await prisma.t_movest.create({
      data: {
        cdemp,              // empresa onde o movimento acontece
        cditem,             // cÃ³digo numÃ©rico do item
        data: movementDate,
        st: type,
        qtde: quantity,
        preco: unitPrice,
        valor: totalValue,
        custo: cost,
        numdoc: dto.document?.number ?? null,
        datadoc: dto.document?.date ? new Date(dto.document.date) : null,
        especie: dto.document?.type ?? null,
        clifor: dto.customerOrSupplier,
        codusu: userCode,
        empitem,            // almoxarifado informado
        empfor,             // empresa de referencia
        empmov,             // empresa do movimento (codigo numerico)
        empven,
        saldoant: previousBalance,
        sldantemp: currentBalance,
        obs: dto.notes ?? null,
        obsit: dto.notes ?? null,
        datalan: movementDate,
        isdeleted: false,
        createdat: new Date(),
        updatedat: new Date(),
      },
    });
  
    // 7ï¸âƒ£ Retorno padrÃ£o
    return {
      id: created.nrlan,
      itemId: cditem,
      type,
      quantity,
      unitPrice,
      totalValue,
      previousBalance,
      currentBalance,
      date: created.data,
    };
  }
  
 
  
}
