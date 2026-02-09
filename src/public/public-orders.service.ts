import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type {
  Prisma,
  PrismaClient as TenantClient,
  t_itsven as TitsvenModel,
  t_vendas as TvendasModel,
} from '../../prisma/generated/client_tenant';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { CreatePublicItsvenDto } from './dto/create-public-itsven.dto';
import { CreatePublicVendaDto } from './dto/create-public-venda.dto';
import { PublicItsvenResponseDto } from './dto/public-itsven-response.dto';
import { PublicOrderResponseDto } from './dto/public-order-response.dto';
import { PublicVendaResponseDto } from './dto/public-venda-response.dto';

type ItemSnapshot = {
  cdemp: number;
  cditem: number;
  deitem: string;
  undven: string | null;
  unitPrice: number;
  minPrice: number;
  cost: number;
  quantity: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  discountPercent: number;
};

type VendaTotals = {
  subtotal: number;
  discountValue: number;
  discountPercent: number;
  total: number;
};

type TenantClientLike = TenantClient | Prisma.TransactionClient;

@Injectable()
export class PublicOrdersService {
  constructor(private readonly tenantDbService: TenantDbService) {}

  private async getPrisma(tenant: string): Promise<TenantClient> {
    return this.tenantDbService.getTenantClient(tenant);
  }

  private toVendaResponse(record: TvendasModel) {
    const mapped = {
      autocod_v: record.autocod_v,
      id: record.ID ?? null,
      nrven_v: record.nrven_v,
      cdemp_v: record.cdemp_v,
      emisven_v: record.emisven_v ?? null,
      cdcli_v: record.cdcli_v ?? null,
      cdfpg_v: record.cdfpg_v ?? null,
      cdtpg_v: record.cdtpg_v ?? null,
      cdven_v: record.cdven_v ?? null,
      restringe_v: record.restringe_v ?? null,
      przent_v: record.przent_v ?? null,
      cdmid: record.cdmid ?? null,
      obsven_v: record.obsven_v ?? null,
      totven_v: record.totven_v ?? null,
      pdesc_v: record.pdesc_v ?? null,
      vdesc_v: record.vdesc_v ?? null,
      pesovol_v: record.pesovol_v ?? null,
      status_v: record.status_v ?? null,
      codusu_v: record.codusu_v,
      trocreq: record.trocreq ?? null,
      empcli: record.empcli ?? null,
      horaven_v: record.horaven_v ?? null,
      id_cliente: record.ID_CLIENTE ?? null,
      createdat: record.createdat ?? null,
      updatedat: record.updatedat ?? null,
    };

    return plainToInstance(PublicVendaResponseDto, mapped, {
      excludeExtraneousValues: true,
    });
  }

  private toPublicOrderResponse(payload: {
    id: string;
    status: string;
    subtotal: number;
    discountValue: number;
    total: number;
    createdAt?: Date | null;
    items: Array<{
      id?: string | null;
      cditem?: number | null;
      description?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }) {
    return plainToInstance(PublicOrderResponseDto, payload, {
      excludeExtraneousValues: true,
    });
  }

  private toItsvenResponse(record: TitsvenModel) {
    const mapped = {
      registro: record.registro,
      id: record.ID ?? null,
      id_venda: record.ID_VENDA ?? null,
      empven: record.empven,
      nrven_iv: record.nrven_iv,
      cdemp_iv: record.cdemp_iv ?? null,
      cditem_iv: record.cditem_iv,
      deitem_iv: record.deitem_iv ?? null,
      unditem_iv: record.unditem_iv ?? null,
      comgru_iv: record.comgru_iv ?? null,
      precmin_iv: record.precmin_iv ?? null,
      precven_iv: record.precven_iv ?? null,
      precpra_iv: record.precpra_iv ?? null,
      qtdesol_iv: record.qtdesol_iv ?? null,
      perdes_iv: record.perdes_iv ?? null,
      codcst_iv: record.codcst_iv ?? null,
      emisven_iv: record.emisven_iv,
      status_iv: record.status_iv ?? null,
      cdven_iv: record.cdven_iv ?? null,
      pesobr_iv: record.pesobr_iv ?? null,
      compra_iv: record.compra_iv ?? null,
      custo_iv: record.custo_iv ?? null,
      st: record.st ?? null,
      mp: record.mp ?? null,
    };

    return plainToInstance(PublicItsvenResponseDto, mapped, {
      excludeExtraneousValues: true,
    });
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    if (typeof value === 'object') {
      const candidate = value as {
        toNumber?: () => number;
        toString?: () => string;
      };
      if (typeof candidate.toNumber === 'function') {
        return candidate.toNumber();
      }
      if (typeof candidate.toString === 'function') {
        return Number(candidate.toString());
      }
    }
    return Number(value);
  }

  private roundMoney(value: number): number {
    return this.roundDecimal(value, 2);
  }

  private roundDecimal(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private normalizeFlag(value?: string | null) {
    return (value ?? '').toString().trim().toUpperCase();
  }

  private applyPromotions(): {
    discountValue: number;
    discountPercent: number;
  } {
    return { discountValue: 0, discountPercent: 0 };
  }

  private buildVendaData(
    dto: CreatePublicVendaDto,
    totals: VendaTotals,
  ): Prisma.t_vendasUncheckedCreateInput {
    return {
      nrven_v: dto.nrven_v,
      cdemp_v: dto.cdemp_v,
      codusu_v: dto.codusu_v,
      emisven_v: dto.emisven_v ? new Date(dto.emisven_v) : undefined,
      cdcli_v: dto.cdcli_v,
      cdfpg_v: dto.cdfpg_v,
      cdtpg_v: dto.cdtpg_v,
      cdven_v: dto.cdven_v,
      restringe_v: dto.restringe_v,
      przent_v: dto.przent_v ? new Date(dto.przent_v) : undefined,
      cdmid: dto.cdmid,
      obsven_v: dto.obsven_v,
      totpro_v: totals.subtotal,
      totven_v: totals.total,
      pdesc_v: totals.discountPercent,
      vdesc_v: totals.discountValue,
      pesovol_v: dto.pesovol_v,
      status_v: dto.status_v,
      trocreq: dto.trocreq,
      empcli: dto.empcli,
      horaven_v: dto.horaven_v,
      ID: dto.id,
      ID_CLIENTE: dto.id_cliente,
      createdat: dto.createdat ? new Date(dto.createdat) : undefined,
      updatedat: dto.updatedat ? new Date(dto.updatedat) : undefined,
    };
  }

  private buildItsvenData(
    dto: CreatePublicItsvenDto,
    snapshot: ItemSnapshot,
    vendaId?: string | null,
  ): Prisma.t_itsvenUncheckedCreateInput {
    return {
      empven: dto.empven,
      nrven_iv: dto.nrven_iv,
      cdemp_iv: dto.cdemp_iv ?? snapshot.cdemp,
      cditem_iv: snapshot.cditem,
      deitem_iv: snapshot.deitem,
      unditem_iv: snapshot.undven ?? dto.unditem_iv,
      comgru_iv: dto.comgru_iv,
      precmin_iv: snapshot.minPrice,
      precven_iv: snapshot.unitPrice,
      precpra_iv: snapshot.unitPrice,
      qtdesol_iv: snapshot.quantity,
      perdes_iv: snapshot.discountPercent,
      codcst_iv: dto.codcst_iv,
      emisven_iv: new Date(dto.emisven_iv),
      status_iv: dto.status_iv,
      cdven_iv: dto.cdven_iv,
      pesobr_iv: dto.pesobr_iv,
      compra_iv: snapshot.cost,
      custo_iv: snapshot.cost,
      st: dto.st,
      mp: dto.mp,
      ID: dto.id,
      ID_VENDA: dto.id_venda ?? vendaId ?? undefined,
    };
  }

  private async fetchItemSnapshots(
    prisma: TenantClientLike,
    itens: CreatePublicItsvenDto[],
  ): Promise<ItemSnapshot[]> {
    const itemsByCdemp = new Map<number, number[]>();

    for (const item of itens) {
      const cdemp = item.cdemp_iv ?? item.empven;
      if (!cdemp) {
        throw new BadRequestException(
          'cdemp_iv ou empven deve ser informado nos itens.',
        );
      }

      if (item.cdemp_iv && item.cdemp_iv !== item.empven) {
        throw new BadRequestException(
          'cdemp_iv deve ser igual a empven quando informado.',
        );
      }

      const quantity = this.toNumber(item.qtdesol_iv);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('qtdesol_iv deve ser maior que zero.');
      }

      const list = itemsByCdemp.get(cdemp) ?? [];
      list.push(item.cditem_iv);
      itemsByCdemp.set(cdemp, list);
    }

    const itemMap = new Map<
      string,
      {
        cdemp: number;
        cditem: number;
        deitem: string | null;
        undven: string | null;
        preco: unknown;
        precomin: unknown;
        custo: unknown;
        ativosn: string | null;
        dispven: string | null;
        ativoprod: string | null;
        negativo: string | null;
        isdeleted: boolean | null;
      }
    >();

    for (const [cdemp, cditems] of itemsByCdemp.entries()) {
      const uniqueCditems = Array.from(new Set(cditems));
      const records = await prisma.t_itens.findMany({
        where: { cdemp, cditem: { in: uniqueCditems } },
        select: {
          cdemp: true,
          cditem: true,
          deitem: true,
          undven: true,
          preco: true,
          precomin: true,
          custo: true,
          ativosn: true,
          dispven: true,
          ativoprod: true,
          negativo: true,
          isdeleted: true,
        },
      });

      for (const record of records) {
        itemMap.set(`${record.cdemp}:${record.cditem}`, record);
      }
    }

    const stockMap = new Map<string, number>();
    for (const [cdemp, cditems] of itemsByCdemp.entries()) {
      const uniqueCditems = Array.from(new Set(cditems));
      const balances = await prisma.t_saldoit.groupBy({
        by: ['cditem'],
        where: { cdemp, cditem: { in: uniqueCditems } },
        _sum: { saldo: true },
      });

      for (const entry of balances) {
        stockMap.set(
          `${cdemp}:${entry.cditem}`,
          this.toNumber(entry._sum.saldo),
        );
      }
    }

    return itens.map((item) => {
      const cdemp = item.cdemp_iv ?? item.empven;
      const record = itemMap.get(`${cdemp}:${item.cditem_iv}`);

      if (!record) {
        throw new NotFoundException(
          `Item ${item.cditem_iv} nao encontrado para cdemp ${cdemp}.`,
        );
      }

      const ativo = this.normalizeFlag(record.ativosn) === 'S';
      const dispven = this.normalizeFlag(record.dispven);
      const ativoprod = this.normalizeFlag(record.ativoprod);
      const bloqueado =
        record.isdeleted === true || dispven === 'N' || ativoprod === 'N';

      if (!ativo || bloqueado) {
        throw new BadRequestException(
          `Item ${record.cditem} nao esta disponivel para venda.`,
        );
      }

      const deitem = (record.deitem ?? '').trim();
      if (!deitem) {
        throw new BadRequestException(
          `Item ${record.cditem} sem descricao para venda.`,
        );
      }

      const unitPrice = this.roundDecimal(this.toNumber(record.preco), 2);
      const minPrice = this.roundDecimal(this.toNumber(record.precomin), 2);
      const cost = this.roundDecimal(this.toNumber(record.custo), 4);

      if (!Number.isFinite(unitPrice)) {
        throw new BadRequestException(
          `Item ${record.cditem} sem preco configurado.`,
        );
      }

      const quantity = this.toNumber(item.qtdesol_iv);
      const lineSubtotal = this.roundMoney(unitPrice * quantity);
      const promo = this.applyPromotions();
      const lineDiscount = this.roundMoney(promo.discountValue);
      const lineTotal = this.roundMoney(lineSubtotal - lineDiscount);
      const stockKey = `${record.cdemp}:${record.cditem}`;
      const saldo = stockMap.get(stockKey);
      const negativo = this.normalizeFlag(record.negativo) === 'S';

      if (saldo !== undefined && !negativo && saldo < quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para o item ${record.cditem}.`,
        );
      }

      return {
        cdemp: record.cdemp,
        cditem: record.cditem,
        deitem,
        undven: record.undven ?? null,
        unitPrice,
        minPrice,
        cost,
        quantity,
        lineSubtotal,
        lineDiscount,
        lineTotal,
        discountPercent: promo.discountPercent,
      };
    });
  }

  private buildTotals(items: ItemSnapshot[]): VendaTotals {
    const subtotal = this.roundMoney(
      items.reduce((sum, item) => sum + item.lineSubtotal, 0),
    );
    const discountValue = this.roundMoney(
      items.reduce((sum, item) => sum + item.lineDiscount, 0),
    );
    const total = this.roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );

    return {
      subtotal,
      discountValue,
      discountPercent: 0,
      total,
    };
  }

  private async updateVendaTotals(
    prisma: TenantClientLike,
    vendaId: string,
  ): Promise<void> {
    const itens = await prisma.t_itsven.findMany({
      where: { ID_VENDA: vendaId },
      select: {
        qtdesol_iv: true,
        precven_iv: true,
      },
    });

    if (!itens.length) {
      return;
    }

    const subtotal = this.roundMoney(
      itens.reduce((sum, item) => {
        const qty = this.toNumber(item.qtdesol_iv);
        const price = this.toNumber(item.precven_iv);
        return sum + qty * price;
      }, 0),
    );

    const venda = await prisma.t_vendas.findFirst({
      where: { ID: vendaId },
      select: { autocod_v: true, nrven_v: true, cdemp_v: true },
    });

    if (!venda) {
      return;
    }

    await prisma.t_vendas.update({
      where: {
        autocod_v_nrven_v_cdemp_v: {
          autocod_v: venda.autocod_v,
          nrven_v: venda.nrven_v,
          cdemp_v: venda.cdemp_v,
        },
      },
      data: {
        totpro_v: subtotal,
        totven_v: subtotal,
        pdesc_v: 0,
        vdesc_v: 0,
      },
    });
  }

  async createVenda(tenant: string, dto: CreatePublicVendaDto) {
    const prisma = await this.getPrisma(tenant);
    const data = this.buildVendaData(dto, {
      subtotal: 0,
      discountValue: 0,
      discountPercent: 0,
      total: 0,
    });

    const record = await prisma.t_vendas.create({ data });
    return this.toVendaResponse(record);
  }

  async createItsven(tenant: string, dto: CreatePublicItsvenDto) {
    const prisma = await this.getPrisma(tenant);
    const [snapshot] = await this.fetchItemSnapshots(prisma, [dto]);
    const data = this.buildItsvenData(dto, snapshot);

    const record = await prisma.t_itsven.create({ data });

    if (record.ID_VENDA) {
      await this.updateVendaTotals(prisma, record.ID_VENDA);
    }
    return this.toItsvenResponse(record);
  }

  async createVendaComItens(
    tenant: string,
    dto: CreatePublicVendaDto,
    itens: CreatePublicItsvenDto[],
  ) {
    if (!itens.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const prisma = await this.getPrisma(tenant);

    return prisma.$transaction(async (tx) => {
      for (const item of itens) {
        if (item.nrven_iv !== dto.nrven_v) {
          throw new BadRequestException(
            'nrven_iv deve ser igual ao nrven_v do cabecalho.',
          );
        }
        if (item.empven !== dto.cdemp_v) {
          throw new BadRequestException(
            'empven deve ser igual ao cdemp_v do cabecalho.',
          );
        }
      }

      const snapshots = await this.fetchItemSnapshots(tx, itens);
      const totals = this.buildTotals(snapshots);

      const vendaRecord = await tx.t_vendas.create({
        data: this.buildVendaData(dto, totals),
      });

      const vendaId = vendaRecord.ID ?? null;

      const createdItems: PublicItsvenResponseDto[] = [];
      for (let index = 0; index < itens.length; index += 1) {
        const item = itens[index];
        const snapshot = snapshots[index];

        const data = this.buildItsvenData(item, snapshot, vendaId);
        const record = await tx.t_itsven.create({ data });
        createdItems.push(this.toItsvenResponse(record));
      }

      return {
        venda: this.toVendaResponse(vendaRecord),
        itens: createdItems,
      };
    });
  }

  async getPublicOrder(tenant: string, vendaId: string) {
    const prisma = await this.getPrisma(tenant);

    const venda = await prisma.t_vendas.findFirst({
      where: { ID: vendaId },
      select: {
        ID: true,
        status_v: true,
        totven_v: true,
        totpro_v: true,
        vdesc_v: true,
        createdat: true,
      },
    });

    if (!venda?.ID) {
      throw new NotFoundException('Pedido nao encontrado.');
    }

    const itens = await prisma.t_itsven.findMany({
      where: { ID_VENDA: vendaId },
      select: {
        ID: true,
        cditem_iv: true,
        deitem_iv: true,
        qtdesol_iv: true,
        precven_iv: true,
      },
    });

    const items = itens.map((item) => {
      const quantity = this.toNumber(item.qtdesol_iv);
      const unitPrice = this.toNumber(item.precven_iv);
      return {
        id: item.ID ?? null,
        cditem: item.cditem_iv ?? null,
        description: item.deitem_iv ?? null,
        quantity,
        unitPrice,
        total: this.roundMoney(quantity * unitPrice),
      };
    });

    const totalFromItems = this.roundMoney(
      items.reduce((sum, item) => sum + item.total, 0),
    );
    const subtotal =
      venda.totpro_v == null ? totalFromItems : this.toNumber(venda.totpro_v);
    const total =
      venda.totven_v == null ? totalFromItems : this.toNumber(venda.totven_v);
    const discountValue = this.toNumber(venda.vdesc_v);
    const status = venda.status_v?.trim() || 'PENDING';

    return this.toPublicOrderResponse({
      id: venda.ID,
      status,
      subtotal,
      discountValue,
      total,
      createdAt: venda.createdat ?? null,
      items,
    });
  }
}
