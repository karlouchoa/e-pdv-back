import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient as TenantClient } from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import type {
  PrimaryKeyType,
  TenantTableConfig,
} from './tenant-table.config';

interface WhereParams {
  [key: string]: string;
}

@Injectable()
export class GenericTenantService {
  private readonly compoundKeyName: string;

  constructor(
    private readonly config: TenantTableConfig,
    private readonly tenantDbService: TenantDbService,
  ) {
    this.compoundKeyName = this.config.primaryKeys
      .map((key) => key.name)
      .join('_');
  }

  private async getDelegate(tenant: string) {
    const prisma = await this.tenantDbService.getTenantClient(tenant);
    const delegate = (prisma as any)?.[this.config.name];

    if (!delegate) {
      throw new NotFoundException(
        `Delegate for model '${this.config.name}' not found in Prisma client.`,
      );
    }

    return { prisma, delegate };
  }

  private castParam(
    name: string,
    type: PrimaryKeyType,
    value?: string,
  ): string | number {
    if (value === undefined) {
      throw new BadRequestException(
        `Missing route parameter '${name}' for resource '${this.config.name}'.`,
      );
    }

    if (type === 'number') {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException(
          `Parameter '${name}' must be a number for resource '${this.config.name}'.`,
        );
      }
      return parsed;
    }

    return value;
  }

  private buildWhere(params: WhereParams) {
    const { primaryKeys } = this.config;

    if (!primaryKeys.length) {
      throw new BadRequestException(
        `Primary key configuration missing for resource '${this.config.name}'.`,
      );
    }

    if (primaryKeys.length === 1) {
      const key = primaryKeys[0];
      return {
        [key.name]: this.castParam(key.name, key.type, params[key.name]),
      };
    }

    const entries = primaryKeys.map((key) => [
      key.name,
      this.castParam(key.name, key.type, params[key.name]),
    ]);

    return {
      [this.compoundKeyName]: Object.fromEntries(entries),
    };
  }

  private async ensureExists(
    delegate: TenantClient[keyof TenantClient],
    where: Record<string, any>,
  ) {
    const entity = await (delegate as any).findUnique({ where });
    if (!entity) {
      throw new NotFoundException(
        `Registro não encontrado em '${this.config.name}'.`,
      );
    }
  }

  async create(tenant: string, dto: Record<string, any>) {
    const { delegate } = await this.getDelegate(tenant);
    return (delegate as any).create({ data: dto });
  }

  async findAll(tenant: string) {
    const { delegate } = await this.getDelegate(tenant);
    return (delegate as any).findMany();
  }

  async findOne(tenant: string, params: WhereParams) {
    const { delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    const record = await (delegate as any).findUnique({ where });

    if (!record) {
      throw new NotFoundException(
        `Registro não encontrado em '${this.config.name}'.`,
      );
    }

    return record;
  }

  async update(
    tenant: string,
    params: WhereParams,
    dto: Record<string, any>,
  ) {
    const { delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    await this.ensureExists(delegate, where);
    return (delegate as any).update({ where, data: dto });
  }

  async remove(tenant: string, params: WhereParams) {
    const { delegate } = await this.getDelegate(tenant);
    const where = this.buildWhere(params);
    await this.ensureExists(delegate, where);
    return (delegate as any).delete({ where });
  }
}
