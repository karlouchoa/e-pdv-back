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
    const cdemp = await this.getCompanyId(tenant, prisma);
    const { start, end } = this.parseDateRange(query.from, query.to);

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
    const cdemp = await this.getCompanyId(tenant, prisma);
    const type = this.normalizeType(filters.type);
    const { start, end } = this.parseDateRange(filters.from, filters.to);

    const where: PrismaTypes.t_movestWhereInput = {
      cdemp: { equals: cdemp },
      st: { equals: type },
      isdeleted: { equals: false },
      ...(filters.itemId ? { cditem: { equals: filters.itemId } } : {}),
    };

    const dateFilter = this.buildDateFilter(start, end);
    if (dateFilter) {
      where.data = dateFilter;
    }

    const movements = await prisma.t_movest.findMany({
      where,
      orderBy: [{ data: 'desc' }, { nrlan: 'desc' }],
    });

    return movements.map((movement) => {
      const quantity = this.toNumber(movement.qtde);
      const unitPrice = this.toOptionalNumber(movement.preco);
      const totalValue =
        this.toOptionalNumber(movement.valor) ??
        this.computeTotalValue(quantity, unitPrice);

      return {
        nrlan: movement.nrlan,
        itemId: movement.cditem ?? null,
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
    const cdemp = await this.getCompanyId(tenant, prisma);
    const { start, end } = this.parseDateRange(query.from, query.to);

    if (!start || !end) {
      throw new BadRequestException('Parametros "from" e "to" sao obrigatorios.');
    }

    const where: PrismaTypes.t_movestWhereInput = {
      cdemp: { equals: cdemp },
      isdeleted: { equals: false },
      ...(query.itemId ? { cditem: { equals: query.itemId } } : {}),
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
      query.itemId !== undefined && query.itemId !== null
        ? await this.getStartingBalance(prisma, cdemp, query.itemId, start)
        : 0;

    return {
      itemId: query.itemId ?? null,
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
  
    // 1️⃣ Data do movimento
    const movementDate = dto.date ? new Date(dto.date) : new Date();
    if (isNaN(movementDate.getTime())) {
      throw new BadRequestException('Data do lançamento inválida.');
    }
  
    // 2️⃣ Normalização e cálculos básicos
    const type = this.normalizeType(dto.type);
    const quantity = Math.abs(dto.quantity);
    const signedQty = this.applySignedQuantity(type, quantity);
    const unitPrice = dto.unitPrice ?? null;
    const totalValue = this.computeTotalValue(quantity, unitPrice);
  
    // 3️⃣ Buscar item pelo GUID --------- (CORRETO)
    const item = await prisma.t_itens.findFirst({
      where: { ID: dto.itemId }, // 👈 campo real do Prisma é ID, não id
    });
  
    if (!item) {
      throw new BadRequestException(`Item '${dto.itemId}' não encontrado.`);
    }
  
    const cditem = item.cditem;   // ok (int)
    const empitem = item.cdemp;   // ok (int) empresa do item
  
    // 4️⃣ Buscar empresa selecionada via GUID --------- (CORRETO)
    const empresa = await prisma.t_emp.findFirst({
      where: { ID: dto.warehouse }, // 👈 novamente campo real é ID
    });
  
    if (!empresa) {
      throw new BadRequestException(
        `Empresa/Almoxarifado '${dto.warehouse}' não encontrada.`,
      );
    }
  
    const cdemp = empresa.cdemp; // empresa selecionada
  
    // 5️⃣ Saldo anterior
    const previousBalance = await this.getStartingBalance(
      prisma,
      cdemp,
      cditem,
      movementDate,
    );
  
    const currentBalance = previousBalance + signedQty;
  
    // 6️⃣ Criar movimento
    const created = await prisma.t_movest.create({
      data: {
        cdemp,              // empresa onde o movimento acontece
        cditem,             // código numérico do item
        data: movementDate,
        st: type,
        qtde: quantity,
        preco: unitPrice,
        valor: totalValue,
        numdoc: dto.document?.number ?? null,
        datadoc: dto.document?.date ? new Date(dto.document.date) : null,
        especie: dto.document?.type ?? null,
        clifor: dto.customerOrSupplier ?? null,
        empitem,            // empresa do item (código numérico)
        saldoant: previousBalance,
        sldantemp: currentBalance,
        obs: dto.notes ?? null,
        datalan: movementDate,
        isdeleted: false,
        createdat: new Date(),
        updatedat: new Date(),
      },
    });
  
    // 7️⃣ Retorno padrão
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
