import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { OrderStatusRepository } from './order-status.repository';
import { OrderStatusHistoryDto } from './dto/order-status-history.dto';

const ALLOWED_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'IN_PREP',
  'READY',
  'OUT_FOR_DELIVERY',
  'DONE',
  'CANCELLED',
]);

const ALLOWED_SOURCES = new Set(['ADMIN', 'PUBLIC', 'SYSTEM']);

const STATUS_CODE_MAP = new Map<string, string>([
  ['PENDING', 'P'],
  ['CONFIRMED', 'C'],
  ['IN_PREP', 'I'],
  ['READY', 'R'],
  ['OUT_FOR_DELIVERY', 'O'],
  ['DONE', 'D'],
  ['CANCELLED', 'X'],
]);

@Injectable()
export class OrdersStatusService {
  constructor(
    private readonly tenantDbService: TenantDbService,
    private readonly repository: OrderStatusRepository,
  ) {}

  private toHistoryDto(
    records: OrderStatusHistoryDto | OrderStatusHistoryDto[],
  ) {
    return plainToInstance(OrderStatusHistoryDto, records, {
      excludeExtraneousValues: true,
    });
  }

  private normalizeStatus(value?: string | null) {
    return (value ?? '').trim().toUpperCase();
  }

  private normalizeSource(value?: string) {
    return (value ?? 'ADMIN').trim().toUpperCase();
  }

  async changeStatus(
    tenant: string,
    vendaId: string,
    newStatus: string,
    source: string | undefined,
    note: string | undefined,
    changedBy: string | null,
  ) {
    const status = this.normalizeStatus(newStatus);
    if (!status) {
      throw new BadRequestException('Status obrigatorio.');
    }
    if (!ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException('Status informado nao permitido.');
    }

    const normalizedSource = this.normalizeSource(source);
    if (!ALLOWED_SOURCES.has(normalizedSource)) {
      throw new BadRequestException('Source informado nao permitido.');
    }

    const prisma = await this.tenantDbService.getTenantClient(tenant);
    const venda = await prisma.t_vendas.findFirst({
      where: { ID: vendaId },
      select: { autocod_v: true, nrven_v: true, cdemp_v: true },
    });

    if (!venda) {
      throw new NotFoundException('Pedido nao encontrado.');
    }

    if (normalizedSource === 'ADMIN' && !changedBy) {
      throw new ForbiddenException('Usuario nao identificado.');
    }

    const record = await this.repository.insertHistory(tenant, {
      vendaId,
      status,
      source: normalizedSource,
      note,
      changedBy,
    });

    const statusCode = STATUS_CODE_MAP.get(status);
    if (statusCode) {
      await prisma.t_vendas.update({
        where: {
          autocod_v_nrven_v_cdemp_v: {
            autocod_v: venda.autocod_v,
            nrven_v: venda.nrven_v,
            cdemp_v: venda.cdemp_v,
          },
        },
        data: {
          status_v: statusCode,
          dtstat_v: new Date(),
        },
      });
    } else {
      // TODO: mapear status para status_v (char(1)) quando definido no legado.
    }

    return this.toHistoryDto(record);
  }

  async listHistory(tenant: string, vendaId: string) {
    const prisma = await this.tenantDbService.getTenantClient(tenant);
    const venda = await prisma.t_vendas.findFirst({
      where: { ID: vendaId },
      select: { autocod_v: true },
    });

    if (!venda) {
      throw new NotFoundException('Pedido nao encontrado.');
    }

    const records = await this.repository.listHistory(tenant, vendaId);
    return this.toHistoryDto(records);
  }
}
