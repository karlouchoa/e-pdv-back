import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  TenantPrisma as Prisma,
  type TenantClient,
} from '../lib/prisma-clients';
import type { Prisma as PrismaTypes } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTItemDto } from './dto/create-t_itens.dto';
import {
  SyncTItensBatchItemDto,
  SyncTItensFormulaDto,
  SyncTItensBatchResponseDto,
  SyncTItensBatchResultItemDto,
} from './dto/sync-t_itens-batch.dto';
import { UpdateTItemDto } from './dto/update-t_itens.dto';
import { NotFoundException } from '@nestjs/common';
import { applyMovestBalanceFromCreates } from '../lib/movest-balance';
import {
  buildCompatibleScalarSelect,
} from '../lib/tenant-schema-compat';

const T_ITENS_SYNC_NUMERIC_FIELDS = [
  'cdemp',
  'cditem',
  'qtembitem',
  'cdgruit',
  'pesobr',
  'pesolq',
  'eminitem',
  'emaxitem',
  'percipi',
  'valcmp',
  'precomin',
  'preco',
  'precoatac',
  'percom',
  'sldatual',
  'custo',
  'margem',
  'margematac',
  'diasent',
  'saldoultent',
  'qtdeprvche',
  'empit',
  'subgru',
  'familiait',
  'pcomprcmin',
  'CCLASSTRIB_ID',
] as const;

const T_ITENS_SYNC_STRING_FIELDS = [
  'deitem',
  'defat',
  'undven',
  'mrcitem',
  'medcmp',
  'barcodeit',
  'locfotitem',
  'usucadit',
  'negativo',
  'ativosn',
  'codcst',
  'aceitadesc',
  'clasfis',
  'codncm',
  'pedcomplsn',
  'ativoprod',
  'enderecoit',
  'obsitem',
  'liberadocomsenha',
  'itprodsn',
  'matprima',
  'servicosn',
  'cest',
  'emitnf',
  'cnae',
  'vendmultemb',
  'naobaixarmp',
  'naovembalanca',
  'abrelote',
  'CCLASSTRIB',
  'categoria_ncm',
  'cst_ibs_cbs_padrao',
  'industrializado_zfm',
  'fiscal_validado',
  'fiscal_origem',
  'combosn',
] as const;

const T_ITENS_SYNC_DATE_FIELDS = [
  'ultcmp',
  'datacadit',
  'dataultent',
  'prvcheg',
  'dtalteracao',
  'fiscal_validado_em',
] as const;

type TenantClientLike = TenantClient | PrismaTypes.TransactionClient;

@Injectable()
export class TItensService {
  private readonly logger = new Logger(TItensService.name);
  private readonly defaultCompanyId = 1;
  private readonly companyCache = new Map<string, number>();
  private readonly matrizCompanyCache = new Map<string, number>();
  private readonly imageTableCapabilitiesByTenant = new Map<
    string,
    Promise<{
      select: Record<string, true>;
      canRead: boolean;
      canWrite: boolean;
      hasAutocod: boolean;
    }>
  >();
  private readonly warnedImageTableByTenant = new Set<string>();
  private readonly reservedFilters = new Set(['cdemp']);
  private readonly scalarFieldMap = new Map(
    Object.values(Prisma.T_itensScalarFieldEnum).map((field) => [
      field.toLowerCase(),
      field,
    ]),
  );

  constructor(private readonly tenantDbService: TenantDbService) {}

  private isGuid(value: string) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  }

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private async buildTItensSelect(
    prisma: TenantClientLike,
    options?: {
      fields?: Iterable<string>;
      includeImages?: boolean;
    },
  ): Promise<PrismaTypes.t_itensSelect> {
    const select = {
      ...(await buildCompatibleScalarSelect(
        prisma,
        't_itens',
        options?.fields,
      )),
    } as PrismaTypes.t_itensSelect;

    return select;
  }

  private async getCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.companyCache.get(tenant);
    if (cached) return cached;

    const firstItem = await prisma.t_itens.findFirst({
      select: { cdemp: true },
      orderBy: { cditem: 'asc' },
    });

    const cdemp = firstItem?.cdemp ?? this.defaultCompanyId;
    this.companyCache.set(tenant, cdemp);
    return cdemp;
  }

  private async getMatrizCompanyId(
    tenant: string,
    prisma: TenantClient,
  ): Promise<number> {
    const cached = this.matrizCompanyCache.get(tenant);
    if (cached) return cached;

    const matriz = await prisma.t_emp.findFirst({
      where: { matriz: 'S' },
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });

    const cdemp = matriz?.cdemp ?? this.defaultCompanyId;
    this.matrizCompanyCache.set(tenant, cdemp);
    return cdemp;
  }

  private async resolveCompanyId(
    tenant: string,
    prisma: TenantClient,
    cdempParam?: unknown,
  ): Promise<number> {
    const parsed = this.toOptionalNumber(cdempParam);
    if (parsed !== null) {
      return parsed;
    }

    const candidate =
      typeof cdempParam === 'string' ? cdempParam.trim() : undefined;

    if (candidate) {
      const company = await prisma.t_emp.findFirst({
        where: {
          OR: [
            { numemp: candidate },
            { apelido: candidate },
            { deemp: candidate },
          ],
        },
        select: { cdemp: true },
      });

      if (company?.cdemp !== undefined && company.cdemp !== null) {
        return company.cdemp;
      }
    }

    // fallback: usa o primeiro cdemp que tem saldo lançado
    const saldoCompany = await prisma.t_saldoit.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });
    if (saldoCompany?.cdemp !== undefined && saldoCompany.cdemp !== null) {
      return saldoCompany.cdemp;
    }

    // fallback adicional: primeiro cdemp em t_emp
    const anyCompany = await prisma.t_emp.findFirst({
      select: { cdemp: true },
      orderBy: { cdemp: 'asc' },
    });
    if (anyCompany?.cdemp !== undefined && anyCompany.cdemp !== null) {
      return anyCompany.cdemp;
    }

    return this.getMatrizCompanyId(tenant, prisma);
  }

  private buildDescriptionFilter(
    rawValue: string | undefined,
  options?: { defaultMode?: 'contains' | 'startsWith' | 'endsWith' },
  ): PrismaTypes.StringFilter | undefined {
    const trimmed = rawValue?.trim();
    if (!trimmed) {
      return undefined;
    }

    const normalized = trimmed.replace(/\*/g, '%');
    const hasWildcard = normalized.includes('%');
    const startsWithWildcard = normalized.startsWith('%');
    const endsWithWildcard = normalized.endsWith('%');
    const token = normalized.replace(/%+/g, '').trim();

    if (!token) {
      return undefined;
    }

    if (hasWildcard) {
      if (startsWithWildcard && endsWithWildcard) {
        return { contains: token, mode: 'insensitive' };
      }
      if (startsWithWildcard) {
        return { endsWith: token, mode: 'insensitive' };
      }
      if (endsWithWildcard) {
        return { startsWith: token, mode: 'insensitive' };
      }
      return { contains: token, mode: 'insensitive' };
    }

    switch (options?.defaultMode) {
      case 'startsWith':
        return { startsWith: token, mode: 'insensitive' };
      case 'endsWith':
        return { endsWith: token, mode: 'insensitive' };
      case 'contains':
      default:
        return { contains: token, mode: 'insensitive' };
    }
  }

  /** -------------------------
   *     CRUD PRINCIPAL
   *  ------------------------- */

  private parseCditem(id: string) {
    const cditem = Number(id);
    if (!Number.isFinite(cditem)) {
      throw new BadRequestException(
        'O identificador do item precisa ser numerico.',
      );
    }
    return cditem;
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

  private parseOptionalPositiveInteger(
    value: unknown,
    fieldName: string,
  ): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${fieldName} deve ser um numero inteiro maior que zero.`,
      );
    }

    return parsed;
  }

  private async resolveSubgroup(
    prisma: TenantClient,
    cdsub: number,
  ): Promise<{ cdsub: number; cdgru: number }> {
    const subgroup = await prisma.t_subgr.findUnique({
      where: { cdsub },
      select: { cdsub: true, cdgru: true },
    });

    if (!subgroup) {
      throw new BadRequestException(`Subgrupo ${cdsub} nao encontrado.`);
    }

    return subgroup;
  }

  private ensureCdemp<T extends Record<string, unknown>>(
    item: T,
    fallbackCdemp: number | null,
  ): T & { cdemp: number | null } {
    const current = this.toOptionalNumber((item as { cdemp?: unknown }).cdemp);
    if (current !== null) {
      return { ...item, cdemp: current };
    }

    return { ...item, cdemp: fallbackCdemp };
  }

  private ensureCdempList<T extends Record<string, unknown>>(
    items: T[],
    fallbackCdemp: number | null,
  ) {
    return items.map((item) => this.ensureCdemp(item, fallbackCdemp));
  }

  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value !== 'string') return Boolean(value);

    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'sim', 's', 'all', 'todos'].includes(
      normalized,
    );
  }

  private toSNFlag(
    value: string | undefined,
    booleanValue: boolean | undefined,
    fallback: 'S' | 'N',
  ): 'S' | 'N' {
    const normalized = value?.trim().toUpperCase();
    if (normalized === 'S' || normalized === 'N') {
      return normalized;
    }

    if (typeof booleanValue === 'boolean') {
      return booleanValue ? 'S' : 'N';
    }

    return fallback;
  }

  private buildWhere(
    cditem: number,
  ): PrismaTypes.t_itensWhereUniqueInput {
    return {
      cditem,
    };
  }

  private toSyncDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private extractExistingTimestamp(record: {
    updatedat?: Date | null;
    createdat?: Date | null;
  }): Date | null {
    return record.updatedat ?? record.createdat ?? null;
  }

  private buildTItensSyncMutationData(payload: SyncTItensBatchItemDto) {
    const data: PrismaTypes.t_itensUncheckedUpdateInput = {};

    for (const field of T_ITENS_SYNC_NUMERIC_FIELDS) {
      const value = payload[field];
      if (value === undefined || value === null) continue;
      (data as Record<string, unknown>)[field] = value;
    }

    for (const field of T_ITENS_SYNC_STRING_FIELDS) {
      const value = payload[field];
      if (value === undefined) continue;
      (data as Record<string, unknown>)[field] = value;
    }

    for (const field of T_ITENS_SYNC_DATE_FIELDS) {
      const value = payload[field];
      if (value === undefined) continue;
      (data as Record<string, unknown>)[field] =
        value === null ? null : this.toSyncDate(value);
    }

    if (payload.isdeleted !== undefined && payload.isdeleted !== null) {
      data.isdeleted = payload.isdeleted;
    }

    return data;
  }

  private toSyncErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Erro inesperado ao sincronizar item.';
  }

  private roundTo(value: number, scale: number): number {
    const factor = 10 ** scale;
    return Math.round(value * factor) / factor;
  }

  private async resolveCompanyContext(
    prisma: TenantClientLike,
    idEmpresaRaw: string | null | undefined,
    fieldName: 'id_empresa' | 'ID_EMPRESA_SALDO',
  ): Promise<{ companyCdemp: number | null }> {
    const candidate = this.normalizeGuid(idEmpresaRaw ?? null);
    if (!candidate) {
      return { companyCdemp: null };
    }

    const numericCdemp = this.toOptionalNumber(candidate);
    if (numericCdemp !== null) {
      return { companyCdemp: Math.floor(numericCdemp) };
    }

    const company = await prisma.t_emp.findFirst({
      where: {
        OR: [
          { numemp: candidate },
          { apelido: candidate },
          { deemp: candidate },
        ],
      },
      select: { cdemp: true },
    });

    if (company?.cdemp === undefined || company.cdemp === null) {
      throw new BadRequestException(
        `${fieldName} ${candidate} nao encontrado em T_EMP.`,
      );
    }

    return {
      companyCdemp: company.cdemp,
    };
  }

  private async resolveItemCompanyContext(
    prisma: TenantClientLike,
    item: SyncTItensBatchItemDto,
  ): Promise<{ companyCdemp: number | null }> {
    const context = await this.resolveCompanyContext(
      prisma,
      item.id_empresa,
      'id_empresa',
    );

    const payloadCdemp =
      typeof item.cdemp === 'number' && Number.isFinite(item.cdemp)
        ? Math.floor(item.cdemp)
        : null;
    if (
      payloadCdemp !== null &&
      context.companyCdemp !== null &&
      payloadCdemp !== context.companyCdemp
    ) {
      throw new BadRequestException(
        `id_empresa do item pertence a cdemp ${context.companyCdemp}, diferente de cdemp ${payloadCdemp} informado no item.`,
      );
    }

    return context;
  }

  private async resolveSaldoCompanyContext(
    prisma: TenantClientLike,
    item: SyncTItensBatchItemDto,
  ): Promise<{ companyCdemp: number | null }> {
    return this.resolveCompanyContext(
      prisma,
      item.ID_EMPRESA_SALDO,
      'ID_EMPRESA_SALDO',
    );
  }

  private async syncStockAdjustmentForItem(
    prisma: TenantClientLike,
    item: SyncTItensBatchItemDto,
    parent: {
      itemRef: string;
      cditem: number;
      cdemp: number;
      companyCdemp: number | null;
    },
  ): Promise<{
    created: boolean;
    type: 'E' | 'S' | null;
    quantity: number;
    previous: number;
    target: number;
  }> {
    if (item.sldatual === undefined || item.sldatual === null) {
      return {
        created: false,
        type: null,
        quantity: 0,
        previous: 0,
        target: 0,
      };
    }

    if (
      !(typeof item.sldatual === 'number' && Number.isFinite(item.sldatual))
    ) {
      throw new BadRequestException(
        `sldatual invalido para o item ${parent.itemRef}.`,
      );
    }

    if (parent.companyCdemp === null) {
      throw new BadRequestException(
        `ID_EMPRESA_SALDO e obrigatorio para ajuste de saldo do item ${parent.itemRef}.`,
      );
    }

    const saldoRows = await prisma.t_saldoit.findMany({
      where: {
        cdemp: parent.companyCdemp,
        cditem: parent.cditem,
      },
      select: { saldo: true },
    });
    const previous = this.roundTo(
      saldoRows.reduce(
        (sum, row) => sum + (this.toOptionalNumber(row.saldo) ?? 0),
        0,
      ),
      4,
    );
    const target = this.roundTo(item.sldatual, 4);
    const diff = this.roundTo(target - previous, 4);

    if (Math.abs(diff) <= 0.00005) {
      return { created: false, type: null, quantity: 0, previous, target };
    }

    const type: 'E' | 'S' = diff > 0 ? 'E' : 'S';
    const quantity = this.roundTo(Math.abs(diff), 4);
    const movementDate =
      this.toSyncDate(item.updatedat) ??
      this.toSyncDate(item.createdat) ??
      new Date();
    const now = new Date();
    const unitPrice =
      typeof item.preco === 'number' && Number.isFinite(item.preco)
        ? this.roundTo(item.preco, 4)
        : 0;
    const cost =
      typeof item.custo === 'number' && Number.isFinite(item.custo)
        ? this.roundTo(item.custo, 4)
        : typeof item.valcmp === 'number' && Number.isFinite(item.valcmp)
          ? this.roundTo(item.valcmp, 4)
          : unitPrice;
    const totalValue = this.roundTo(unitPrice * quantity, 4);

    await prisma.t_movest.create({
      data: {
        cdemp: parent.companyCdemp,
        data: movementDate,
        datadoc: movementDate,
        datalan: now,
        especie: 'A',
        cditem: parent.cditem,
        qtde: quantity,
        valor: totalValue,
        preco: unitPrice,
        custo: cost,
        st: type,
        codusu: 'INTEGRA',
        empitem: parent.companyCdemp,
        empfor: parent.companyCdemp,
        empmov: parent.companyCdemp,
        empven: parent.companyCdemp,
        saldoant: previous,
        sldantemp: target,
        obs: 'Ajuste de saldo via integracao t_itens/sync-batch',
        obsit: 'Ajuste de saldo via integracao t_itens/sync-batch',
        isdeleted: false,
        createdat: now,
        updatedat: now,
      },
    });

    await applyMovestBalanceFromCreates(prisma, [
      {
        cdemp: parent.companyCdemp,
        cditem: parent.cditem,
        empitem: parent.companyCdemp,
        st: type,
        qtde: quantity,
        isdeleted: false,
      },
    ]);

    return { created: true, type, quantity, previous, target };
  }

  private normalizeGuid(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async resolveFormulaMateriaPrima(
    prisma: TenantClientLike,
    formula: SyncTItensFormulaDto,
  ): Promise<{
    idMatprima: string | null;
    matprima: number | null;
    empitemmp: number | null;
    undmp: string | null;
    deitem: string | null;
  }> {
    let idMatprima = this.normalizeGuid(formula.id_matprima ?? null);
    let matprima =
      typeof formula.matprima === 'number' && Number.isFinite(formula.matprima)
        ? Math.floor(formula.matprima)
        : null;
    let empitemmp =
      typeof formula.empitemmp === 'number' &&
      Number.isFinite(formula.empitemmp)
        ? Math.floor(formula.empitemmp)
        : null;
    let undmp = formula.undmp?.trim() ?? null;
    let deitem = formula.deitem_iv?.trim() ?? null;

    if (idMatprima && matprima === null && /^\d+$/.test(idMatprima)) {
      matprima = Math.floor(Number(idMatprima));
    }

    if (matprima !== null && empitemmp !== null) {
      const item = await prisma.t_itens.findFirst({
        where: { cdemp: empitemmp, cditem: matprima },
        select: {
          undven: true,
          deitem: true,
        },
      });

      if (item) {
        undmp = undmp ?? item.undven?.trim() ?? null;
        deitem = deitem ?? item.deitem?.trim() ?? null;
      }
    }

    return { idMatprima, matprima, empitemmp, undmp, deitem };
  }

  private async syncFormulasForItem(
    prisma: TenantClientLike,
    item: SyncTItensBatchItemDto,
    parent: { itemRef: string; cdemp: number; cditem: number; undven: string },
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    deleted: number;
  }> {
    if (!Array.isArray(item.formulas)) {
      return { inserted: 0, updated: 0, skipped: 0, deleted: 0 };
    }

    const formulas = item.formulas;
    const deleted = (
      await prisma.t_formulas.deleteMany({
        where: { empitem: parent.cdemp, cditem: parent.cditem },
      })
    ).count;

    if (!formulas.length) {
      return { inserted: 0, updated: 0, skipped: 0, deleted };
    }

    let inserted = 0;
    const updated = 0;
    const skipped = 0;

    for (const formula of formulas) {
      const formulaItemId = this.normalizeGuid(formula.id_item ?? null);
      if (
        formulaItemId &&
        /^\d+$/.test(formulaItemId) &&
        Math.floor(Number(formulaItemId)) !== parent.cditem
      ) {
        throw new BadRequestException(
          `Formula do item ${parent.itemRef} com id_item divergente (${formulaItemId}).`,
        );
      }

      const formulaCditem =
        typeof formula.cditem === 'number' && Number.isFinite(formula.cditem)
          ? Math.floor(formula.cditem)
          : parent.cditem;
      if (formulaCditem !== parent.cditem) {
        throw new BadRequestException(
          `Formula do item ${parent.cditem} com cditem divergente (${formulaCditem}).`,
        );
      }

      const incomingCreatedAt = this.toSyncDate(formula.createdat);
      const incomingUpdatedAt = this.toSyncDate(formula.updatedat);
      const resolved = await this.resolveFormulaMateriaPrima(prisma, formula);

      const formulaCdemp =
        typeof formula.cdemp === 'number' && Number.isFinite(formula.cdemp)
          ? Math.floor(formula.cdemp)
          : parent.cdemp;

      if (resolved.matprima === null || resolved.empitemmp === null) {
        throw new BadRequestException(
          `Formula do item ${parent.itemRef} sem identificacao valida da materia-prima.`,
        );
      }

      if (
        !(
          typeof formula.qtdemp === 'number' &&
          Number.isFinite(formula.qtdemp) &&
          formula.qtdemp > 0
        )
      ) {
        throw new BadRequestException(
          `Formula do item ${parent.itemRef} com qtdemp invalida.`,
        );
      }

      const undmp = formula.undmp?.trim() ?? resolved.undmp;
      if (!undmp) {
        throw new BadRequestException(
          `Formula do item ${parent.itemRef} sem undmp.`,
        );
      }

      const createdAt = incomingCreatedAt ?? new Date();
      const updatedAt = incomingUpdatedAt ?? createdAt;

      const createData: PrismaTypes.t_formulasUncheckedCreateInput = {
        cditem: formulaCditem,
        empitem:
          typeof formula.empitem === 'number' &&
          Number.isFinite(formula.empitem)
            ? Math.floor(formula.empitem)
            : parent.cdemp,
        undven: (formula.undven?.trim() || parent.undven || 'UN').slice(0, 3),
        matprima: resolved.matprima,
        qtdemp: formula.qtdemp,
        undmp: undmp.slice(0, 3),
        empitemmp: resolved.empitemmp,
        deitem_iv: formula.deitem_iv ?? resolved.deitem ?? null,
        cdemp: formulaCdemp,
        createdat: createdAt,
        updatedat: updatedAt,
      };

      await prisma.t_formulas.create({ data: createData });
      inserted += 1;
    }

    return { inserted, updated, skipped, deleted };
  }

  async syncBatchById(tenant: string, items: SyncTItensBatchItemDto[]) {
    if (!items.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const prisma = await this.getPrisma(tenant);
    const fallbackCdemp = await this.getMatrizCompanyId(tenant, prisma);
    const results: SyncTItensBatchResultItemDto[] = [];

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
      const itemRef =
        item.id?.trim() ??
        item.ID?.trim() ??
        (typeof item.cditem === 'number' && Number.isFinite(item.cditem)
          ? String(Math.floor(item.cditem))
          : '');

      try {
        const outcome = await prisma.$transaction(async (tx) => {
          const itemCompanyContext = await this.resolveItemCompanyContext(
            tx,
            item,
          );
          const saldoCompanyContext = await this.resolveSaldoCompanyContext(
            tx,
            item,
          );
          const requestedCditem =
            typeof item.cditem === 'number' && Number.isFinite(item.cditem)
              ? Math.floor(item.cditem)
              : null;
          const incomingCreatedAt = this.toSyncDate(item.createdat);
          const incomingUpdatedAt = this.toSyncDate(item.updatedat);
          const existing = await tx.t_itens.findFirst({
            where:
              requestedCditem !== null
                ? { cditem: requestedCditem }
                : { cditem: -1 },
            select: {
              cdemp: true,
              cditem: true,
              undven: true,
              updatedat: true,
              createdat: true,
            },
          });

          if (existing) {
            let action: 'UPDATED' | 'SKIPPED' = 'SKIPPED';
            let message = 'Registro existente sem alteracao no item.';
            let parent = {
              itemRef: itemRef || String(existing.cditem),
              cdemp: existing.cdemp,
              cditem: existing.cditem,
              undven: existing.undven?.trim() || 'UN',
              companyCdemp: saldoCompanyContext.companyCdemp,
            };

            if (!incomingUpdatedAt) {
              message = 'Registro existente sem updatedat no payload.';
            } else {
              const currentTs = this.extractExistingTimestamp(existing);
              if (
                currentTs &&
                incomingUpdatedAt.getTime() <= currentTs.getTime()
              ) {
                message =
                  'updatedat do payload menor ou igual ao registro atual; sem alteracao.';
              } else {
                const data = this.buildTItensSyncMutationData(item);
                delete (data as Record<string, unknown>).cdemp;
                delete (data as Record<string, unknown>).cditem;
                delete (data as Record<string, unknown>).createdat;
                data.updatedat = incomingUpdatedAt;

                const updatedItem = await tx.t_itens.update({
                  where: { cditem: existing.cditem },
                  data,
                  select: {
                    cdemp: true,
                    cditem: true,
                    undven: true,
                  },
                });
                parent = {
                  itemRef: itemRef || String(updatedItem.cditem),
                  cdemp: updatedItem.cdemp,
                  cditem: updatedItem.cditem,
                  undven: updatedItem.undven?.trim() || 'UN',
                  companyCdemp: saldoCompanyContext.companyCdemp,
                };
                action = 'UPDATED';
                message = 'Item atualizado com sucesso.';
              }
            }

            const formulaSummary = await this.syncFormulasForItem(
              tx,
              item,
              parent,
            );
            if (
              action === 'SKIPPED' &&
              (formulaSummary.deleted > 0 || formulaSummary.inserted > 0)
            ) {
              action = 'UPDATED';
              message =
                'Item sem alteracao; formulas sincronizadas com sucesso.';
            }
            if (Array.isArray(item.formulas)) {
              message += ` Formulas: ${formulaSummary.deleted} removidas, ${formulaSummary.inserted} inseridas.`;
            }

            const stockAdjustment = await this.syncStockAdjustmentForItem(
              tx,
              item,
              parent,
            );
            if (stockAdjustment.created) {
              if (action === 'SKIPPED') {
                action = 'UPDATED';
                message = 'Item sem alteracao; ajuste de saldo aplicado.';
              }
              message += ` Ajuste estoque: ${stockAdjustment.type} ${stockAdjustment.quantity} (saldo ${stockAdjustment.previous} -> ${stockAdjustment.target}).`;
            }

            return { action, message };
          }

          if (!incomingCreatedAt) {
            return {
              action: 'SKIPPED' as const,
              message: 'Item novo sem createdat no payload.',
            };
          }

          const data = this.buildTItensSyncMutationData(
            item,
          ) as PrismaTypes.t_itensUncheckedCreateInput;
          const cdempValue =
            typeof item.cdemp === 'number' && Number.isFinite(item.cdemp)
              ? Math.floor(item.cdemp)
              : itemCompanyContext.companyCdemp !== null
                ? itemCompanyContext.companyCdemp
                : fallbackCdemp;

          data.cdemp = cdempValue;
          if (typeof item.cditem === 'number' && Number.isFinite(item.cditem)) {
            data.cditem = Math.floor(item.cditem);
          }
          data.createdat = incomingCreatedAt;
          data.updatedat = incomingUpdatedAt ?? incomingCreatedAt;

          const created = await tx.t_itens.create({
            data,
            select: {
              cdemp: true,
              cditem: true,
              undven: true,
            },
          });

          const formulaSummary = await this.syncFormulasForItem(tx, item, {
            itemRef: itemRef || String(created.cditem),
            cdemp: created.cdemp,
            cditem: created.cditem,
            undven: created.undven?.trim() || 'UN',
          });

          let message = 'Item inserido com sucesso.';
          if (Array.isArray(item.formulas)) {
            message += ` Formulas: ${formulaSummary.deleted} removidas, ${formulaSummary.inserted} inseridas.`;
          }

          const stockAdjustment = await this.syncStockAdjustmentForItem(
            tx,
            item,
            {
              itemRef: itemRef || String(created.cditem),
              cdemp: created.cdemp,
              cditem: created.cditem,
              companyCdemp: saldoCompanyContext.companyCdemp,
            },
          );
          if (stockAdjustment.created) {
            message += ` Ajuste estoque: ${stockAdjustment.type} ${stockAdjustment.quantity} (saldo ${stockAdjustment.previous} -> ${stockAdjustment.target}).`;
          }

          return {
            action: 'INSERTED' as const,
            message,
          };
        });

        if (outcome.action === 'INSERTED') {
          inserted += 1;
        } else if (outcome.action === 'UPDATED') {
          updated += 1;
        } else {
          skipped += 1;
        }

        results.push({
          id: itemRef || '',
          action: outcome.action,
          message: outcome.message,
        });
      } catch (error) {
        errors += 1;
        results.push({
          id: itemRef || '',
          action: 'ERROR',
          message: this.toSyncErrorMessage(error),
        });
      }
    }

    return plainToInstance(
      SyncTItensBatchResponseDto,
      {
        total: items.length,
        inserted,
        updated,
        skipped,
        errors,
        results,
      },
      { excludeExtraneousValues: true },
    );
  }

  private resolveImageUrls(item: {
    locfotitem?: string | null;
    t_imgitens?: Array<{ autocod?: number | null; url?: string | null }>;
  }) {
    return this.resolveImages(item).map((image) => image.url);
  }

  private resolveImages(item: {
    locfotitem?: string | null;
    t_imgitens?: Array<{ autocod?: number | null; url?: string | null }>;
  }) {
    const images: Array<{ id?: string; url: string }> = [];
    for (const image of item.t_imgitens ?? []) {
      const url = (image.url ?? '').trim();
      if (!url) {
        continue;
      }

      const id =
        typeof image.autocod === 'number' && Number.isFinite(image.autocod)
          ? String(image.autocod)
          : undefined;
      if (id) {
        images.push({ id, url });
      } else {
        images.push({ url });
      }
    }

    if (images.length) {
      return images;
    }

    const fallback = item.locfotitem?.trim();
    return fallback ? [{ url: fallback }] : [];
  }

  private withImageUrls<T extends { locfotitem?: string | null }>(
    item: T & {
      t_imgitens?: Array<{ autocod?: number | null; url?: string | null }>;
    },
  ) {
    const images = this.resolveImages(item);
    const imageUrls = this.resolveImageUrls(item);
    const primaryImage = imageUrls[0] ?? item.locfotitem ?? null;
    return {
      ...item,
      locfotitem: primaryImage,
      images,
      imageUrls,
    };
  }

  private withImageUrlsList<T extends { locfotitem?: string | null }>(
    items: Array<
      T & {
        t_imgitens?: Array<{ autocod?: number | null; url?: string | null }>;
      }
    >,
  ) {
    return items.map((item) => this.withImageUrls(item));
  }

  private async getImageTableCapabilities(
    tenant: string,
    prisma: TenantClientLike,
  ) {
    const cached = this.imageTableCapabilitiesByTenant.get(tenant);
    if (cached) {
      return cached;
    }

    const capabilitiesPromise = (async () => {
      const select = await buildCompatibleScalarSelect(prisma, 't_imgitens', [
        'autocod',
        'cditem',
        'empitem',
        'url',
      ]);

      const hasAutocod = Boolean(select.autocod);
      const canRead = Boolean(select.cditem && select.empitem && select.url);
      const canWrite = canRead && hasAutocod;

      return {
        select,
        canRead,
        canWrite,
        hasAutocod,
      };
    })();

    this.imageTableCapabilitiesByTenant.set(tenant, capabilitiesPromise);
    return capabilitiesPromise;
  }

  private warnImageTableIncompatible(
    tenant: string,
    capabilities: { canRead: boolean; canWrite: boolean; hasAutocod: boolean },
  ) {
    if (this.warnedImageTableByTenant.has(tenant)) {
      return;
    }

    this.warnedImageTableByTenant.add(tenant);
    this.logger.warn(
      `[t_imgitens] schema incompatível para tenant '${tenant}': canRead=${capabilities.canRead} canWrite=${capabilities.canWrite} hasAutocod=${capabilities.hasAutocod}. Usando fallback por locfotitem.`,
    );
  }

  private async attachImages<
    T extends { cditem?: number | null; cdemp?: number | null },
  >(tenant: string, prisma: TenantClient, items: T[]): Promise<
    Array<
      T & {
        t_imgitens: Array<{ autocod?: number | null; url?: string | null }>;
      }
    >
  > {
    const imageKeys = items
      .map((item) => {
        const cditem = this.toOptionalNumber(item.cditem);
        const cdemp = this.toOptionalNumber(item.cdemp);
        if (cditem === null || cdemp === null) {
          return null;
        }
        return { cditem, cdemp };
      })
      .filter(
        (entry): entry is { cditem: number; cdemp: number } => entry !== null,
      );

    if (!imageKeys.length) {
      return items.map((item) => ({ ...item, t_imgitens: [] }));
    }

    const cditems = [...new Set(imageKeys.map((entry) => entry.cditem))];
    const emps = [...new Set(imageKeys.map((entry) => entry.cdemp))];
    const capabilities = await this.getImageTableCapabilities(tenant, prisma);

    if (!capabilities.canRead) {
      this.warnImageTableIncompatible(tenant, capabilities);
      return items.map((item) => ({ ...item, t_imgitens: [] }));
    }

    const rows = await prisma.t_imgitens.findMany({
      where: {
        cditem: { in: cditems },
        empitem: { in: emps },
      },
      ...(capabilities.hasAutocod ? { orderBy: [{ autocod: 'asc' }] } : {}),
      select: capabilities.select,
    });

    const imageMap = new Map<string, Array<{ autocod?: number | null; url?: string | null }>>();
    for (const row of rows) {
      const cditem = this.toOptionalNumber(row.cditem);
      const cdemp = this.toOptionalNumber(row.empitem);
      if (cditem === null || cdemp === null) {
        continue;
      }
      const key = `${cdemp}:${cditem}`;
      const bucket = imageMap.get(key) ?? [];
      bucket.push({ autocod: row.autocod, url: row.url });
      imageMap.set(key, bucket);
    }

    return items.map((item) => {
      const cditem = this.toOptionalNumber(item.cditem);
      const cdemp = this.toOptionalNumber(item.cdemp);
      const key =
        cditem !== null && cdemp !== null ? `${cdemp}:${cditem}` : null;
      return {
        ...item,
        t_imgitens: key ? (imageMap.get(key) ?? []) : [],
      };
    });
  }

  private async attachCategorias<T extends { cdgruit?: unknown }>(
    prisma: TenantClient,
    items: T[],
  ): Promise<
    Array<T & { categoria: { cdgru: number; degru: string | null } | null }>
  > {
    const categoryIds = [
      ...new Set(
        items
          .map((item) => this.toOptionalNumber(item.cdgruit))
          .filter((id): id is number => id !== null),
      ),
    ];

    if (!categoryIds.length) {
      return items.map((item) => ({ ...item, categoria: null }));
    }

    const categories = await prisma.t_gritens.findMany({
      where: { cdgru: { in: categoryIds } },
      select: { cdgru: true, degru: true },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.cdgru, category]),
    );

    return items.map((item) => {
      const cdgruit = this.toOptionalNumber(item.cdgruit);
      return {
        ...item,
        categoria: cdgruit !== null ? (categoryMap.get(cdgruit) ?? null) : null,
      };
    });
  }

  private normalizeImageInputs(
    images?: Array<
      { id?: string | null; URL?: string | null; url?: string | null } | string
    >,
  ) {
    if (!Array.isArray(images)) return [];

    const seen = new Set<string>();
    return images
      .map((image) => {
        if (typeof image === 'string') {
          const trimmed = image.trim() || undefined;
          if (trimmed && trimmed.length > 200) {
            throw new BadRequestException(
              'Cada url de imagem deve ter no maximo 200 caracteres.',
            );
          }
          return { url: trimmed };
        }
        const url = image.url ?? image.URL;
        const trimmedUrl = url?.trim() || undefined;
        if (trimmedUrl && trimmedUrl.length > 200) {
          throw new BadRequestException(
            'Cada url de imagem deve ter no maximo 200 caracteres.',
          );
        }

        return {
          id: image.id?.trim() || undefined,
          url: trimmedUrl,
        };
      })
      .filter((image) => image.id || image.url)
      .filter((image) => {
        const key = image.id ? `id:${image.id}` : `url:${image.url}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private resolvePrimaryImageUrl(images: Array<{ url?: string }>) {
    const candidate = images.find((image) => image.url)?.url;
    return candidate?.trim() || null;
  }

  private normalizeImagePath(value: string | null | undefined): string | null {
    const normalized = value?.trim() || null;
    if (!normalized) {
      return null;
    }
    if (normalized.length > 200) {
      throw new BadRequestException(
        'O caminho da imagem deve ter no maximo 200 caracteres.',
      );
    }
    return normalized;
  }

  private async ensurePrimaryImageRecord(
    tenant: string,
    prisma: TenantClient,
    item: { cdemp: number; cditem: number },
    imagePath: string | null | undefined,
  ) {
    const normalizedPath = this.normalizeImagePath(imagePath);
    if (!normalizedPath) {
      return;
    }

    const capabilities = await this.getImageTableCapabilities(tenant, prisma);
    if (!capabilities.canWrite) {
      this.warnImageTableIncompatible(tenant, capabilities);
      return;
    }

    const existing = await prisma.t_imgitens.findFirst({
      where: {
        empitem: item.cdemp,
        cditem: item.cditem,
        url: normalizedPath,
      },
      select: { autocod: true },
    });

    if (existing) {
      return;
    }

    await prisma.t_imgitens.create({
      data: {
        empitem: item.cdemp,
        cditem: item.cditem,
        url: normalizedPath,
        updatedat: new Date(),
      },
    });
  }

  private async syncItemImages(
    tenant: string,
    prisma: TenantClient,
    item: { cdemp: number; cditem: number },
    images: Array<{ id?: string; url?: string }>,
  ) {
    const capabilities = await this.getImageTableCapabilities(tenant, prisma);
    if (!capabilities.canWrite) {
      this.warnImageTableIncompatible(tenant, capabilities);
      return;
    }

    const urls = Array.from(
      new Set(
        images
          .map((image) => image.url?.trim())
          .filter((url): url is string => Boolean(url)),
      ),
    );
    const operations: PrismaTypes.PrismaPromise<unknown>[] = [];
    const now = new Date();

    operations.push(
      prisma.t_imgitens.deleteMany({
        where: { empitem: item.cdemp, cditem: item.cditem },
      }),
    );

    for (const url of urls) {
      operations.push(
        prisma.t_imgitens.create({
          data: {
            empitem: item.cdemp,
            cditem: item.cditem,
            url: url,
            updatedat: now,
          },
        }),
      );
    }

    if (!operations.length) return;

    await prisma.$transaction(operations);
  }

  private async attachSaldo<T extends { cditem?: number | null }>(
    prisma: TenantClient,
    cdemp: number,
    items: T[],
  ): Promise<Array<T & { saldo: number | null }>> {
    const ids = items
      .map((item) => item.cditem)
      .filter((id): id is number => typeof id === 'number');

    if (!ids.length) {
      return items.map((item) => ({ ...item, saldo: null }));
    }

    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where: {
        cdemp,
        cditem: { in: ids },
      },
      _sum: { saldo: true },
    });

    const balanceMap = new Map<number, number | null>();
    for (const entry of balances) {
      balanceMap.set(entry.cditem, this.toOptionalNumber(entry._sum.saldo));
    }

    return items.map((item) => ({
      ...item,
      saldo: balanceMap.get(item.cditem ?? -1) ?? null,
    }));
  }

  private async fetchBalances(
    prisma: TenantClient,
    cdemp: number,
    cditems?: number[],
  ) {
    const where: PrismaTypes.t_saldoitWhereInput = {
      cdemp,
      ...(cditems?.length ? { cditem: { in: cditems } } : {}),
    };

    const balances = await prisma.t_saldoit.groupBy({
      by: ['cditem'],
      where,
      _sum: { saldo: true },
    });

    return balances.map((entry) => ({
      cditem: entry.cditem,
      saldo: this.toOptionalNumber(entry._sum.saldo) ?? 0,
    }));
  }

  async create(tenant: string, dto: CreateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const hasImagesPayload = Array.isArray(dto.images);
    const imageInputs = this.normalizeImageInputs(dto.images);
    const primaryImageUrl = this.resolvePrimaryImageUrl(imageInputs);
    const imagePath = this.normalizeImagePath(dto.imagePath);
    let resolvedCategory = this.parseOptionalPositiveInteger(
      dto.category,
      'category',
    );
    let resolvedSubgroup = this.parseOptionalPositiveInteger(
      dto.subgroup,
      'subgroup',
    );

    if (resolvedSubgroup !== null) {
      const subgroup = await this.resolveSubgroup(prisma, resolvedSubgroup);
      if (resolvedCategory !== null && subgroup.cdgru !== resolvedCategory) {
        throw new BadRequestException(
          'Subgrupo informado nao pertence ao grupo selecionado.',
        );
      }
      resolvedCategory = resolvedCategory ?? subgroup.cdgru;
      resolvedSubgroup = subgroup.cdsub;
    }

    const maxItem = await prisma.t_itens.aggregate({
      where: { cdemp },
      _max: { cditem: true },
    });
    const nextCditem =
      typeof maxItem._max.cditem === 'number' &&
      Number.isFinite(maxItem._max.cditem)
        ? maxItem._max.cditem + 1
        : 1;

    const data = {
      cdemp,
      cditem: nextCditem,

      // mapeamento DTO → banco
      deitem: dto.name,
      defat: dto.description ?? '',
      undven: dto.unit ?? 'UN',
      cdgruit: resolvedCategory,
      subgru: resolvedSubgroup,

      preco: dto.salePrice ?? 0,
      custo: dto.costPrice ?? 0,

      codncm: dto.ncm || null,
      cest: dto.cest || null,
      codcst: dto.cst || null,
      barcodeit: dto.barcode || null,

      diasent: dto.leadTimeDays ?? 0,

      itprodsn: this.toSNFlag(dto.itprodsn, dto.isComposed, 'N'),
      matprima: this.toSNFlag(dto.matprima, dto.isRawMaterial, 'N'),
      combosn: this.toSNFlag(dto.combosn, dto.isCombo, 'N'),

      obsitem: dto.notes ?? null,
      locfotitem: imagePath ?? primaryImageUrl ?? null,

      // defaults obrigatórios
      ativosn: this.toSNFlag(dto.ativosn, dto.isActive, 'S'),
      negativo: this.toSNFlag(dto.negativo, dto.isNegative, 'S'),
      aceitadesc: 'S',

      qtembitem: 0,
      pesobr: 0,
      pesolq: 0,
      eminitem: 0,
      emaxitem: 0,
      percipi: 0,
      valcmp: 0,
      precomin: 0,
      percom: 0,
      sldatual: 0,

      datacadit: new Date(),
      updatedat: new Date(),
    };

    const created = await prisma.t_itens.create({
      data,
      select: await this.buildTItensSelect(prisma),
    });
    if (hasImagesPayload) {
      await this.syncItemImages(tenant, prisma, created, imageInputs);
    }
    await this.ensurePrimaryImageRecord(
      tenant,
      prisma,
      created,
      created.locfotitem,
    );
    return this.ensureCdemp(created, cdemp);
  }

  async findAll(tenant: string, filters?: Record<string, string | string[]>) {
    const prisma = await this.getPrisma(tenant);

    const getParam = (key: string) => {
      const value = filters?.[key];
      return Array.isArray(value) ? value[value.length - 1] : value;
    };

    const pageInput = Number(getParam('page'));
    const page =
      Number.isFinite(pageInput) && pageInput > 0 ? Math.floor(pageInput) : 1;
    const pageSizeRaw = getParam('pageSize');
    const pageSizeInput = Number(pageSizeRaw);
    const allParam = getParam('all');
    const wantsAll =
      this.isTruthy(allParam) ||
      (typeof pageSizeRaw === 'string' &&
        pageSizeRaw.trim().toLowerCase() === 'all') ||
      pageSizeInput === 0;
    const pageSize = wantsAll
      ? null
      : Number.isFinite(pageSizeInput) && pageSizeInput > 0
        ? Math.min(pageSizeInput, 100)
        : 10;

    const cdempParam = getParam('cdemp');
    const saldoCdemp = await this.resolveCompanyId(tenant, prisma, cdempParam);
    const itemsCdemp = await this.getMatrizCompanyId(tenant, prisma);

    const descricaoPrefix = getParam('descricao') ?? getParam('descricaoPrefix');
    const cdgruitParam = getParam('cdgruit');
    const matprimaParam = getParam('matprima');
    const saldoParam = getParam('saldo');
    const includeSaldoParam = getParam('includeSaldo');
    const wantSaldo =
      (typeof includeSaldoParam === 'string'
        ? includeSaldoParam.toLowerCase() === 'true'
        : Boolean(includeSaldoParam)) || !!saldoParam;
    const filtersWhere = this.buildFilters(filters);

    console.log(
      '[t_itens] findAll input',
      JSON.stringify(
        {
          tenant,
          cdempParam,
          cdempResolved: itemsCdemp,
          cdempSaldo: saldoCdemp,
          page,
          pageSize,
          wantsAll,
          descricaoPrefix,
          cdgruit: cdgruitParam,
          matprima: matprimaParam,
          saldo: saldoParam,
          includeSaldo: wantSaldo,
          extraFilters: filtersWhere,
        },
        null,
        2,
      ),
    );

    const where: PrismaTypes.t_itensWhereInput = {
      cdemp: itemsCdemp,
      ...filtersWhere,
    };
    const itemSelect = await this.buildTItensSelect(prisma, {
      includeImages: true,
    });

    const descriptionFilter = this.buildDescriptionFilter(descricaoPrefix, {
      defaultMode: 'contains',
    });
    if (descriptionFilter) {
      where.deitem = descriptionFilter;
    }

    const cdgruit = Number(cdgruitParam);
    if (Number.isFinite(cdgruit)) {
      where.cdgruit = cdgruit;
    }

    const matprima = matprimaParam?.toString().trim().toUpperCase();
    if (matprima === 'S' || matprima === 'N') {
      where.matprima = matprima;
    }

    const skip = wantsAll || pageSize === null ? 0 : (page - 1) * pageSize;
    const saldoFilter = saldoParam
      ? saldoParam.toString().trim().toUpperCase()
      : null;
    const requiresSaldoFilter = saldoFilter === 'COM' || saldoFilter === 'SEM';

    if (!requiresSaldoFilter) {
      const findManyArgs: PrismaTypes.t_itensFindManyArgs = {
        where,
        orderBy: [{ cditem: 'asc' }],
        select: itemSelect,
      };

      if (!wantsAll && pageSize !== null) {
        findManyArgs.skip = skip;
        findManyArgs.take = pageSize;
      }

      const [items, total] = await Promise.all([
        prisma.t_itens.findMany(findManyArgs),
        prisma.t_itens.count({ where }),
      ]);

      const itemsWithSaldo = await this.attachSaldo(prisma, saldoCdemp, items);
      const ensuredItems = this.ensureCdempList(itemsWithSaldo, itemsCdemp);
      const itemsWithCategorias = await this.attachCategorias(
        prisma,
        ensuredItems,
      );
      const itemsWithImages = this.withImageUrlsList(
        await this.attachImages(tenant, prisma, itemsWithCategorias),
      );
      const response = {
        data: itemsWithImages,
        total,
        count: total,
        records: total,
      };
      console.log(
        '[t_itens] findAll response (sem filtro de saldo)',
        JSON.stringify(
          {
            cdemp: itemsCdemp,
            cdempSaldo: saldoCdemp,
            page,
            pageSize,
            wantsAll,
            total,
            sample: response.data.slice(0, 3),
            where,
            wantSaldo,
          },
          null,
          2,
        ),
      );
      return response;
    }

    const balances = await this.fetchBalances(prisma, saldoCdemp);
    const filteredBalances = balances.filter((b) =>
      saldoFilter === 'COM' ? b.saldo > 0 : b.saldo <= 0,
    );

    if (!filteredBalances.length) {
      const emptyResponse = { data: [], total: 0, count: 0, records: 0 };
      console.log(
        '[t_itens] findAll response (com filtro de saldo vazio)',
        JSON.stringify(
          {
            cdemp: itemsCdemp,
            cdempSaldo: saldoCdemp,
            saldoFilter,
            page,
            pageSize,
            total: 0,
            where,
          },
          null,
          2,
        ),
      );
      return emptyResponse;
    }

    const saldoMap = new Map<number, number | null>();
    for (const entry of filteredBalances) {
      saldoMap.set(entry.cditem, this.toOptionalNumber(entry.saldo) ?? 0);
    }

    const cditemsToFetch = [...saldoMap.keys()];
    const chunkSize = 1500; // limite conservador para evitar excesso de parametros em IN (...)
    type Item = PrismaTypes.t_itensGetPayload<PrismaTypes.t_itensFindManyArgs>;
    const filteredItems: Item[] = [];

    for (let i = 0; i < cditemsToFetch.length; i += chunkSize) {
      const chunkCditems = cditemsToFetch.slice(i, i + chunkSize);
      const chunkWhere: PrismaTypes.t_itensWhereInput = {
        ...where,
        cditem: { in: chunkCditems },
      };

      const chunkItems = await prisma.t_itens.findMany({
        where: chunkWhere,
        orderBy: [{ cditem: 'asc' }],
        select: itemSelect,
      });

      filteredItems.push(...chunkItems);
    }

    filteredItems.sort((a, b) => (a.cditem ?? 0) - (b.cditem ?? 0));

    const itemsWithSaldo = filteredItems.map((item) => ({
      ...item,
      saldo: saldoMap.get(item.cditem ?? -1) ?? null,
    }));
    const ensuredItems = this.ensureCdempList(itemsWithSaldo, itemsCdemp);

    const total = ensuredItems.length;
    const paginated =
      wantsAll || pageSize === null
        ? ensuredItems
        : ensuredItems.slice(skip, skip + pageSize);
    const itemsWithCategorias = await this.attachCategorias(prisma, paginated);
    const itemsWithImages = this.withImageUrlsList(
      await this.attachImages(tenant, prisma, itemsWithCategorias),
    );

    const response = {
      data: itemsWithImages,
      total,
      count: total,
      records: total,
    };
    console.log(
      '[t_itens] findAll response (com filtro de saldo)',
      JSON.stringify(
        {
          cdemp: itemsCdemp,
          cdempSaldo: saldoCdemp,
          saldoFilter,
          page,
          pageSize,
          wantsAll,
          total,
          fetchedItems: filteredItems.length,
          filteredItems: itemsWithSaldo.length,
          sample: response.data.slice(0, 3).map((item) => ({
            cditem: item.cditem,
            saldo: item.saldo,
          })),
          where: { ...where, cditemCount: cditemsToFetch.length },
        },
        null,
        2,
      ),
    );
    return response;
  }

  async searchByDescription(
    tenant: string,
    description?: string,
    filters?: { matprima?: string; itprodsn?: string },
  ) {
    const term = description?.trim();
    if (!term) {
      throw new BadRequestException('Parametro "description" obrigatorio.');
    }
    console.log('[searchByDescription] term:', term);

    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);

    const isNumeric = /^\d+$/.test(term);
    const descriptionFilter = this.buildDescriptionFilter(term, {
      defaultMode: 'contains',
    });

    const where: PrismaTypes.t_itensWhereInput = isNumeric
      ? {
          cdemp,
          cditem: Number(term),
        }
      : {
          cdemp,
          ...(descriptionFilter ? { deitem: descriptionFilter } : {}),
        };

    const matprima = filters?.matprima?.trim().toUpperCase();
    if (matprima === 'S' || matprima === 'N') {
      where.matprima = matprima;
    }

    const itprodsn = filters?.itprodsn?.trim().toUpperCase();
    if (itprodsn === 'S' || itprodsn === 'N') {
      where.itprodsn = itprodsn;
    }

    const results = await prisma.t_itens.findMany({
      where,
      orderBy: { deitem: 'asc' },
      select: await this.buildTItensSelect(prisma, {
        includeImages: true,
      }),
    });

    const itemsWithSaldo = await this.attachSaldo(prisma, cdemp, results);
    const ensuredItems = this.ensureCdempList(itemsWithSaldo, cdemp);
    const itemsWithCategorias = await this.attachCategorias(
      prisma,
      ensuredItems,
    );
    return this.withImageUrlsList(
      await this.attachImages(tenant, prisma, itemsWithCategorias),
    );
  }

  async findOne(tenant: string, id: string) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const cditem = this.parseCditem(id);

    const item = await prisma.t_itens.findUnique({
      where: this.buildWhere(cditem),
      select: await this.buildTItensSelect(prisma, {
        includeImages: true,
      }),
    });
    if (!item) return item;
    const ensured = this.ensureCdemp(item, cdemp);
    const [withCategoria] = await this.attachCategorias(prisma, [ensured]);
    const [withImages] = await this.attachImages(tenant, prisma, [withCategoria]);
    return this.withImageUrls(withImages);
  }

  async update(tenant: string, id: string, dto: UpdateTItemDto) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = await this.getMatrizCompanyId(tenant, prisma);
    const cditemParam = this.parseCditem(id);
    const hasImagesPayload = Array.isArray(dto.images);
    const imageInputs = this.normalizeImageInputs(dto.images);
    const primaryImageUrl = this.resolvePrimaryImageUrl(imageInputs);
    const imagePath =
      dto.imagePath !== undefined
        ? this.normalizeImagePath(dto.imagePath)
        : undefined;

    // 1️⃣ Buscar o item pelo UUID
    const existing = await prisma.t_itens.findFirst({
      where: {
        cdemp,
        cditem: cditemParam,
      },
      select: await this.buildTItensSelect(prisma, {
        fields: ['cditem', 'cdgruit', 'subgru'],
      }),
    });

    if (!existing) {
      throw new NotFoundException('Item nao encontrado para este tenant.');
    }

    const hasCategoryField = Object.prototype.hasOwnProperty.call(
      dto,
      'category',
    );
    const hasSubgroupField = Object.prototype.hasOwnProperty.call(
      dto,
      'subgroup',
    );

    let resolvedCategory = hasCategoryField
      ? this.parseOptionalPositiveInteger(dto.category, 'category')
      : this.toOptionalNumber(existing.cdgruit);
    let resolvedSubgroup = hasSubgroupField
      ? this.parseOptionalPositiveInteger(dto.subgroup, 'subgroup')
      : this.toOptionalNumber(existing.subgru);

    if (hasSubgroupField) {
      if (resolvedSubgroup !== null) {
        const subgroup = await this.resolveSubgroup(prisma, resolvedSubgroup);
        if (resolvedCategory !== null && subgroup.cdgru !== resolvedCategory) {
          throw new BadRequestException(
            'Subgrupo informado nao pertence ao grupo selecionado.',
          );
        }
        resolvedCategory = resolvedCategory ?? subgroup.cdgru;
        resolvedSubgroup = subgroup.cdsub;
      }
    } else if (hasCategoryField && resolvedSubgroup !== null) {
      try {
        const subgroup = await this.resolveSubgroup(prisma, resolvedSubgroup);
        if (resolvedCategory === null || subgroup.cdgru !== resolvedCategory) {
          resolvedSubgroup = null;
        }
      } catch {
        resolvedSubgroup = null;
      }
    }

    const cditem = existing.cditem; // <- chave real

    // 2️⃣ Construir data de atualização
    const data: any = {
      deitem: dto.name,
      defat: dto.description,
      undven: dto.unit,
      mrcitem: dto.marca,
      ...(hasCategoryField || hasSubgroupField
        ? {
            cdgruit: resolvedCategory,
            subgru: resolvedSubgroup,
          }
        : {}),

      preco: dto.salePrice,
      custo: dto.costPrice,
      valcmp: dto.valcmp,
      margem: dto.margem,

      codncm: dto.ncm,
      cest: dto.cest,
      codcst: dto.cst,
      barcodeit: dto.barcode,

      diasent: dto.leadTimeDays,
      qtembitem: dto.qtembitem,

      itprodsn:
        dto.itprodsn !== undefined || dto.isComposed !== undefined
          ? this.toSNFlag(dto.itprodsn, dto.isComposed, 'N')
          : undefined,
      matprima:
        dto.matprima !== undefined || dto.isRawMaterial !== undefined
          ? this.toSNFlag(dto.matprima, dto.isRawMaterial, 'N')
          : undefined,
      combosn:
        dto.combosn !== undefined || dto.isCombo !== undefined
          ? this.toSNFlag(dto.combosn, dto.isCombo, 'N')
          : undefined,
      ativosn:
        dto.ativosn !== undefined || dto.isActive !== undefined
          ? this.toSNFlag(dto.ativosn, dto.isActive, 'S')
          : undefined,
      negativo:
        dto.negativo !== undefined || dto.isNegative !== undefined
          ? this.toSNFlag(dto.negativo, dto.isNegative, 'S')
          : undefined,

      obsitem: dto.notes,

      updatedat: new Date(),
    };

    if (dto.imagePath !== undefined) {
      data.locfotitem = imagePath;
    } else if (hasImagesPayload) {
      data.locfotitem = primaryImageUrl;
    } else if (primaryImageUrl) {
      data.locfotitem = primaryImageUrl;
    }

    // Remove undefined
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key],
    );

    // 3️⃣ UPDATE via PK composta (cdemp + cditem)
    const updated = await prisma.t_itens.update({
      where: { cditem },
      data,
      select: await this.buildTItensSelect(prisma),
    });
    if (hasImagesPayload) {
      await this.syncItemImages(tenant, prisma, updated, imageInputs);
    }
    await this.ensurePrimaryImageRecord(
      tenant,
      prisma,
      updated,
      updated.locfotitem,
    );
    return this.ensureCdemp(updated, cdemp);
  }

  async remove(tenant: string, id: string, cdempInput: unknown) {
    const prisma = await this.getPrisma(tenant);
    const cdemp = this.toOptionalNumber(cdempInput);
    if (cdemp === null) {
      throw new BadRequestException('O campo cdemp deve ser numerico.');
    }

    const existing = await prisma.t_itens.findFirst({
      where: {
        cdemp,
        cditem: this.parseCditem(id),
      },
      select: { cditem: true },
    });

    if (!existing) {
      throw new NotFoundException('Item nao encontrado para este tenant.');
    }

    const hasMovements = await prisma.t_movest.findFirst({
      where: {
        cdemp,
        cditem: existing.cditem,
      },
      select: { nrlan: true },
    });

    if (hasMovements) {
      throw new BadRequestException(
        'Item possui movimentacoes em estoque e nao pode ser excluido.',
      );
    }

    const updated = await prisma.t_itens.update({
      where: { cditem: existing.cditem },
      data: {
        isdeleted: true,
        ativosn: 'N',
        ativoprod: 'N',
        updatedat: new Date(),
      },
      select: await this.buildTItensSelect(prisma),
    });
    return this.ensureCdemp(updated, cdemp);
  }

  /** -------------------------
   *     FILTROS E TRATAMENTO
   *  ------------------------- */

  private sanitizeFilterValue(
    value: string | string[],
  ): { value: string; wasQuoted: boolean } | undefined {
    if (value === undefined || value === null) return undefined;

    const raw = Array.isArray(value) ? value[value.length - 1] : value;
    const trimmed = `${raw}`.trim();
    if (!trimmed) return undefined;

    const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
    const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');

    if (hasSingleQuotes || hasDoubleQuotes) {
      return { value: trimmed.slice(1, -1), wasQuoted: true };
    }

    return { value: trimmed, wasQuoted: false };
  }

  private tryCoerceValue(value: {
    value: string;
    wasQuoted: boolean;
  }): string | number {
    if (value.wasQuoted) return value.value;

    const numeric = Number(value.value);
    if (!Number.isNaN(numeric) && value.value !== '') {
      return numeric;
    }

    return value.value;
  }

  private buildFilters(
    filters?: Record<string, string | string[]>,
  ): PrismaTypes.t_itensWhereInput {
    const where: PrismaTypes.t_itensWhereInput = {};
    if (!filters) return where;

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      const normalizedKey = rawKey.trim().toLowerCase();
      if (!normalizedKey || this.reservedFilters.has(normalizedKey)) continue;

      const mappedField = this.scalarFieldMap.get(normalizedKey);
      if (!mappedField) continue;

      const sanitized = this.sanitizeFilterValue(rawValue);
      if (!sanitized) continue;

      const coerced = this.tryCoerceValue(sanitized);
      (where as Record<string, unknown>)[mappedField] = coerced;
    }

    return where;
  }
}
