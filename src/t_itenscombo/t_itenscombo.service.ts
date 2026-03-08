import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  PrismaClient as TenantClient,
  t_itenscombo as TItensComboModel,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from '../lib/prisma-clients';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreateTItensComboDto } from './dto/create-t_itenscombo.dto';
import { TItensComboResponseDto } from './dto/t_itenscombo-response.dto';
import { UpdateTItensComboDto } from './dto/update-t_itenscombo.dto';

@Injectable()
export class TItensComboService {
  private readonly logger = new Logger(TItensComboService.name);

  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toResponse(record: TItensComboModel) {
    return plainToInstance(TItensComboResponseDto, record, {
      excludeExtraneousValues: true,
    });
  }

  private toResponseList(records: TItensComboModel[]) {
    return records.map((record) => this.toResponse(record));
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    const parsed = new Date(String(value ?? ''));
    if (Number.isNaN(parsed.getTime())) {
      return new Date(0);
    }
    return parsed;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeUuid(value: string, field: string): string {
    const trimmed = value.trim();
    if (!this.isUuid(trimmed)) {
      throw new BadRequestException(`${field} invalido. Informe UUID valido.`);
    }
    return trimmed;
  }

  private asUuidSql(value: string, field: string) {
    const normalized = this.normalizeUuid(value, field);
    return TenantPrisma.sql`${normalized}::uuid`;
  }

  private asOptionalUuidSql(value: string | null, field: string) {
    if (value === null) {
      return TenantPrisma.sql`NULL`;
    }
    return this.asUuidSql(value, field);
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error ?? '');
  }

  private throwWriteError(error: unknown, fallbackMessage: string): never {
    const message = this.readErrorMessage(error).toLowerCase();

    if (message.includes('uniqueidentifier')) {
      throw new BadRequestException('id_item invalido. Informe UUID valido.');
    }
    if (message.includes('uuid')) {
      throw new BadRequestException('id_item invalido. Informe UUID valido.');
    }

    if (
      message.includes('foreign key') ||
      message.includes('constraint') ||
      message.includes('reference')
    ) {
      throw new BadRequestException(
        'Nao foi possivel salvar o combo. Verifique item e subgrupo informados.',
      );
    }

    throw new BadRequestException(fallbackMessage);
  }

  private mapRawToResponseRecord(
    row: Record<string, unknown>,
  ): TItensComboResponseDto {
    const read = (key: string) =>
      Object.prototype.hasOwnProperty.call(row, key)
        ? row[key]
        : row[key.toLowerCase()];

    return plainToInstance(
      TItensComboResponseDto,
      {
        autocod: Math.trunc(this.toNumber(read('autocod'))),
        id: String(read('id') ?? ''),
        id_item: String(read('id_item') ?? ''),
        CDGRU: Math.trunc(this.toNumber(read('CDGRU'))),
        QTDE: this.toNumber(read('QTDE')),
        ID_SUBGRUPO: read('ID_SUBGRUPO') ? String(read('ID_SUBGRUPO')) : null,
        createdat: this.toDate(read('createdat')),
        updatedat: this.toDate(read('updatedat')),
      },
      { excludeExtraneousValues: true },
    );
  }

  private async queryAllRaw(prisma: TenantClient) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
      TenantPrisma.sql`
        SELECT
          autocod,
          ID,
          id_item,
          CDGRU,
          QTDE,
          ID_SUBGRUPO,
          createdat,
          updatedat
        FROM t_itenscombo
        ORDER BY autocod ASC
      `,
    );
    return rows.map((row) => this.mapRawToResponseRecord(row));
  }

  private async queryByItemRaw(prisma: TenantClient, idItem: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
      TenantPrisma.sql`
        SELECT
          autocod,
          ID,
          id_item,
          CDGRU,
          QTDE,
          ID_SUBGRUPO,
          createdat,
          updatedat
        FROM t_itenscombo
        WHERE id_item = ${this.asUuidSql(idItem, 'id_item')}
        ORDER BY autocod ASC
      `,
    );
    return rows.map((row) => this.mapRawToResponseRecord(row));
  }

  private async queryOneByIdRaw(prisma: TenantClient, id: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
      TenantPrisma.sql`
        SELECT
          autocod,
          ID,
          id_item,
          CDGRU,
          QTDE,
          ID_SUBGRUPO,
          createdat,
          updatedat
        FROM t_itenscombo
        WHERE ID = ${this.asUuidSql(id, 'id')}
        LIMIT 1
      `,
    );

    const row = rows[0];
    return row ? this.mapRawToResponseRecord(row) : null;
  }

  private async queryLatestByItemAndGroupRaw(
    prisma: TenantClient,
    idItem: string,
    cdgru: number,
  ) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
      TenantPrisma.sql`
        SELECT
          autocod,
          ID,
          id_item,
          CDGRU,
          QTDE,
          ID_SUBGRUPO,
          createdat,
          updatedat
        FROM t_itenscombo
        WHERE id_item = ${this.asUuidSql(idItem, 'id_item')}
          AND CDGRU = ${cdgru}
        ORDER BY autocod DESC
        LIMIT 1
      `,
    );

    const row = rows[0];
    return row ? this.mapRawToResponseRecord(row) : null;
  }

  private isSameQuantity(left: unknown, right: unknown): boolean {
    return Math.abs(this.toNumber(left) - this.toNumber(right)) < 0.0001;
  }

  private assertSameQuantity(
    existing: TItensComboResponseDto,
    requestedQtde: number,
  ) {
    if (!this.isSameQuantity(existing.QTDE, requestedQtde)) {
      throw new BadRequestException(
        'Ja existe regra de combo para este item e subgrupo com quantidade diferente.',
      );
    }
  }

  private async findExistingRuleByItemAndGroup(
    prisma: TenantClient,
    idItem: string,
    cdgru: number,
  ) {
    try {
      const record = await prisma.t_itenscombo.findFirst({
        where: { id_item: idItem, cdgru: cdgru },
        orderBy: { autocod: 'desc' },
      });

      if (record) {
        return this.toResponse(record);
      }
    } catch (error: any) {
      this.logger.warn(
        `findExistingRuleByItemAndGroup via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );
    }

    return this.queryLatestByItemAndGroupRaw(prisma, idItem, cdgru);
  }

  private async ensureItemExistsById(prisma: TenantClient, idItem: string) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(
      TenantPrisma.sql`
        SELECT ID
        FROM T_ITENS
        WHERE ID = ${this.asUuidSql(idItem, 'id_item')}
        LIMIT 1
      `,
    );

    if (!rows[0]) {
      throw new BadRequestException('Item informado em id_item nao encontrado.');
    }
  }

  private normalizeOptionalUuid(
    value: string | null | undefined,
    field: string,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (!this.isUuid(trimmed)) {
      throw new BadRequestException(`${field} invalido. Informe UUID valido.`);
    }

    return trimmed;
  }

  private async resolveSubgroupLink(
    prisma: TenantClient,
    payload: { cdgru?: number | null; idSubgrupo?: string | null; context: string },
  ) {
    const subgroupCode =
      typeof payload.cdgru === 'number' && Number.isInteger(payload.cdgru)
        ? payload.cdgru
        : null;
    const subgroupId = this.normalizeOptionalUuid(
      payload.idSubgrupo ?? null,
      `${payload.context}.id_subgrupo`,
    );

    if (subgroupCode === null && !subgroupId) {
      throw new BadRequestException(
        `${payload.context} deve informar cdgru ou id_subgrupo.`,
      );
    }

    if (subgroupId) {
      const subgroup = await prisma.t_subgr.findFirst({
        where: { id: subgroupId },
        select: { cdsub: true, id: true },
      });

      if (!subgroup) {
        throw new BadRequestException(
          `${payload.context}.id_subgrupo nao encontrado em t_subgr.`,
        );
      }

      if (subgroupCode !== null && subgroup.cdsub !== subgroupCode) {
        throw new BadRequestException(
          `${payload.context} possui cdgru diferente do id_subgrupo informado.`,
        );
      }

      return {
        cdsub: subgroup.cdsub,
        idSubgrupo: subgroup.id,
      };
    }

    const subgroup = await prisma.t_subgr.findUnique({
      where: { cdsub: subgroupCode as number },
      select: { cdsub: true, id: true },
    });

    if (!subgroup) {
      throw new BadRequestException(
        `Subgrupo ${subgroupCode} informado em cdgru nao encontrado.`,
      );
    }

    const subgroupUuid = subgroup.id?.trim();
    if (!subgroupUuid) {
      throw new BadRequestException(
        `Subgrupo ${subgroup.cdsub} sem ID para vinculo em t_itenscombo.ID_SUBGRUPO.`,
      );
    }

    return {
      cdsub: subgroup.cdsub,
      idSubgrupo: subgroupUuid,
    };
  }

  private async resolveSubgroupForUpdate(
    prisma: TenantClient,
    dto: UpdateTItensComboDto,
  ) {
    if (dto.cdgru === undefined && dto.id_subgrupo === undefined) {
      return null;
    }

    return this.resolveSubgroupLink(prisma, {
      cdgru: dto.cdgru,
      idSubgrupo: dto.id_subgrupo,
      context: 'atualizacao de combo',
    });
  }

  private async resolveExistingById(
    prisma: TenantClient,
    id: string,
  ): Promise<TItensComboResponseDto | null> {
    try {
      const record = await prisma.t_itenscombo.findUnique({
        where: { id: id },
      });

      if (record) {
        return this.toResponse(record);
      }
    } catch (error: any) {
      this.logger.warn(
        `resolveExistingById via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );
    }

    return this.queryOneByIdRaw(prisma, id);
  }

  private mapUpdateData(dto: UpdateTItensComboDto) {
    const data: Record<string, unknown> = {};

    if (dto.id_item !== undefined) {
      data.id_item = this.normalizeUuid(dto.id_item, 'id_item');
    }
    if (dto.cdgru !== undefined) {
      data.CDGRU = dto.cdgru;
    }
    if (dto.qtde !== undefined) {
      data.QTDE = dto.qtde;
    }
    if (dto.id_subgrupo !== undefined) {
      data.ID_SUBGRUPO = this.normalizeOptionalUuid(
        dto.id_subgrupo,
        'ID_SUBGRUPO',
      );
    }

    return data;
  }

  async create(tenant: string, dto: CreateTItensComboDto) {
    const prisma = await this.getPrisma(tenant);
    const idItem = this.normalizeUuid(dto.id_item, 'id_item');
    await this.ensureItemExistsById(prisma, idItem);
    const subgroup = await this.resolveSubgroupLink(prisma, {
      cdgru: dto.cdgru,
      idSubgrupo: dto.id_subgrupo,
      context: 'cadastro de combo',
    });

    const existingBeforeCreate = await this.findExistingRuleByItemAndGroup(
      prisma,
      idItem,
      subgroup.cdsub,
    );
    if (existingBeforeCreate) {
      this.assertSameQuantity(existingBeforeCreate, dto.qtde);
      return existingBeforeCreate;
    }

    try {
      const record = await prisma.t_itenscombo.create({
        data: {
          id_item: idItem,
          cdgru: subgroup.cdsub,
          qtde: dto.qtde,
          id_subgrupo: subgroup.idSubgrupo,
        },
      });

      return this.toResponse(record);
    } catch (error: any) {
      this.logger.warn(
        `create via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );

      const existingAfterPrismaError = await this.findExistingRuleByItemAndGroup(
        prisma,
        idItem,
        subgroup.cdsub,
      );
      if (existingAfterPrismaError) {
        this.assertSameQuantity(existingAfterPrismaError, dto.qtde);
        return existingAfterPrismaError;
      }

      try {
        const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
          TenantPrisma.sql`
            INSERT INTO t_itenscombo (id_item, CDGRU, QTDE, ID_SUBGRUPO)
            SELECT
              ${this.asUuidSql(idItem, 'id_item')},
              ${subgroup.cdsub},
              ${dto.qtde},
              ${this.asUuidSql(subgroup.idSubgrupo, 'id_subgrupo')}
            WHERE NOT EXISTS (
              SELECT 1
              FROM t_itenscombo
              WHERE id_item = ${this.asUuidSql(idItem, 'id_item')}
                AND CDGRU = ${subgroup.cdsub}
            )
            RETURNING
              autocod AS autocod,
              ID AS ID,
              id_item AS id_item,
              CDGRU AS CDGRU,
              QTDE AS QTDE,
              ID_SUBGRUPO AS ID_SUBGRUPO,
              createdat AS createdat,
              updatedat AS updatedat
          `,
        );

        const row = rows[0];
        if (row) {
          return this.mapRawToResponseRecord(row);
        }

        const existingAfterFallback = await this.findExistingRuleByItemAndGroup(
          prisma,
          idItem,
          subgroup.cdsub,
        );
        if (existingAfterFallback) {
          this.assertSameQuantity(existingAfterFallback, dto.qtde);
          return existingAfterFallback;
        }

        throw new BadRequestException('Falha ao salvar item em t_itenscombo.');
      } catch (rawError) {
        this.throwWriteError(rawError, 'Falha ao salvar item em t_itenscombo.');
      }
    }
  }

  async findAll(tenant: string) {
    const prisma = await this.getPrisma(tenant);
    try {
      const records = await prisma.t_itenscombo.findMany({
        orderBy: { autocod: 'asc' },
      });
      return this.toResponseList(records);
    } catch (error: any) {
      this.logger.warn(
        `findAll via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );
      return this.queryAllRaw(prisma);
    }
  }

  async findByItemId(tenant: string, idItem: string) {
    const trimmedId = this.normalizeUuid(idItem, 'id_item');

    const prisma = await this.getPrisma(tenant);
    try {
      const records = await prisma.t_itenscombo.findMany({
        where: { id_item: trimmedId },
        orderBy: { autocod: 'asc' },
      });
      return this.toResponseList(records);
    } catch (error: any) {
      this.logger.warn(
        `findByItemId via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );
      return this.queryByItemRaw(prisma, trimmedId);
    }
  }

  async findOne(tenant: string, id: string) {
    const normalizedId = this.normalizeUuid(id, 'id');
    const prisma = await this.getPrisma(tenant);
    try {
      const record = await prisma.t_itenscombo.findUnique({
        where: { id: normalizedId },
      });

      if (!record) {
        throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
      }

      return this.toResponse(record);
    } catch (error: any) {
      this.logger.warn(
        `findOne via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );

      const fallback = await this.queryOneByIdRaw(prisma, normalizedId);
      if (!fallback) {
        throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
      }
      return fallback;
    }
  }

  async update(tenant: string, id: string, dto: UpdateTItensComboDto) {
    const normalizedId = this.normalizeUuid(id, 'id');
    const prisma = await this.getPrisma(tenant);
    const data = this.mapUpdateData(dto);
    const existing = await this.resolveExistingById(prisma, normalizedId);

    if (!existing) {
      throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar.',
      );
    }

    if (typeof data.id_item === 'string') {
      await this.ensureItemExistsById(prisma, data.id_item);
    }
    const resolvedSubgroup = await this.resolveSubgroupForUpdate(
      prisma,
      dto,
    );
    if (resolvedSubgroup) {
      data.CDGRU = resolvedSubgroup.cdsub;
      data.ID_SUBGRUPO = resolvedSubgroup.idSubgrupo;
    }

    try {
      const updated = await prisma.t_itenscombo.update({
        where: { id: normalizedId },
        data: {
          ...data,
          updatedat: new Date(),
        },
      });

      return this.toResponse(updated);
    } catch (error: any) {
      this.logger.warn(
        `update via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );

      try {
        const assignments: Array<ReturnType<typeof TenantPrisma.sql>> = [];

        if (data.id_item !== undefined) {
          assignments.push(
            TenantPrisma.sql`id_item = ${this.asUuidSql(String(data.id_item), 'id_item')}`,
          );
        }
        if (data.CDGRU !== undefined) {
          assignments.push(TenantPrisma.sql`CDGRU = ${Number(data.CDGRU)}`);
        }
        if (data.ID_SUBGRUPO !== undefined) {
          assignments.push(
            TenantPrisma.sql`ID_SUBGRUPO = ${this.asOptionalUuidSql(
              data.ID_SUBGRUPO === null ? null : String(data.ID_SUBGRUPO),
              'ID_SUBGRUPO',
            )}`,
          );
        }
        if (data.QTDE !== undefined) {
          assignments.push(TenantPrisma.sql`QTDE = ${Number(data.QTDE)}`);
        }

        assignments.push(TenantPrisma.raw('updatedat = CURRENT_TIMESTAMP'));

        const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
          TenantPrisma.sql`
            UPDATE t_itenscombo
            SET ${TenantPrisma.join(assignments)}
            WHERE ID = ${this.asUuidSql(normalizedId, 'id')}
            RETURNING
              autocod AS autocod,
              ID AS ID,
              id_item AS id_item,
              CDGRU AS CDGRU,
              QTDE AS QTDE,
              ID_SUBGRUPO AS ID_SUBGRUPO,
              createdat AS createdat,
              updatedat AS updatedat
          `,
        );

        const row = rows[0];
        if (!row) {
          throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
        }

        return this.mapRawToResponseRecord(row);
      } catch (rawError) {
        if (rawError instanceof NotFoundException) {
          throw rawError;
        }
        this.throwWriteError(rawError, 'Falha ao atualizar item em t_itenscombo.');
      }
    }
  }

  async remove(tenant: string, id: string) {
    const normalizedId = this.normalizeUuid(id, 'id');
    const prisma = await this.getPrisma(tenant);

    try {
      const record = await prisma.t_itenscombo.findUnique({
        where: { id: normalizedId },
      });

      if (!record) {
        throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
      }

      const deleted = await prisma.t_itenscombo.delete({
        where: { id: normalizedId },
      });

      return this.toResponse(deleted);
    } catch (error: any) {
      this.logger.warn(
        `remove via Prisma falhou, usando fallback SQL: ${error?.message ?? error}`,
      );

      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
        TenantPrisma.sql`
          DELETE FROM t_itenscombo
          WHERE ID = ${this.asUuidSql(normalizedId, 'id')}
          RETURNING
            autocod AS autocod,
            ID AS ID,
            id_item AS id_item,
            CDGRU AS CDGRU,
            QTDE AS QTDE,
            ID_SUBGRUPO AS ID_SUBGRUPO,
            createdat AS createdat,
            updatedat AS updatedat
        `,
      );

      const row = rows[0];
      if (!row) {
        throw new NotFoundException(`ItensCombo ${normalizedId} nao encontrado.`);
      }

      return this.mapRawToResponseRecord(row);
    }
  }
}
