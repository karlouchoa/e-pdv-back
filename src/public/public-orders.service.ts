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
import { PublicVendaResponseDto } from './dto/public-venda-response.dto';

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

  private buildVendaData(
    dto: CreatePublicVendaDto,
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
      totven_v: dto.totven_v,
      pdesc_v: dto.pdesc_v,
      vdesc_v: dto.vdesc_v,
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
    deitem: string,
    vendaId?: string | null,
  ): Prisma.t_itsvenUncheckedCreateInput {
    return {
      empven: dto.empven,
      nrven_iv: dto.nrven_iv,
      cdemp_iv: dto.cdemp_iv,
      cditem_iv: dto.cditem_iv,
      deitem_iv: deitem,
      unditem_iv: dto.unditem_iv,
      comgru_iv: dto.comgru_iv,
      precmin_iv: dto.precmin_iv,
      precven_iv: dto.precven_iv,
      precpra_iv: dto.precpra_iv,
      qtdesol_iv: dto.qtdesol_iv,
      perdes_iv: dto.perdes_iv,
      codcst_iv: dto.codcst_iv,
      emisven_iv: new Date(dto.emisven_iv),
      status_iv: dto.status_iv,
      cdven_iv: dto.cdven_iv,
      pesobr_iv: dto.pesobr_iv,
      compra_iv: dto.compra_iv,
      custo_iv: dto.custo_iv,
      st: dto.st,
      mp: dto.mp,
      ID: dto.id,
      ID_VENDA: dto.id_venda ?? vendaId ?? undefined,
    };
  }

  async createVenda(tenant: string, dto: CreatePublicVendaDto) {
    const prisma = await this.getPrisma(tenant);
    const data = this.buildVendaData(dto);

    const record = await prisma.t_vendas.create({ data });
    return this.toVendaResponse(record);
  }

  async createItsven(tenant: string, dto: CreatePublicItsvenDto) {
    const prisma = await this.getPrisma(tenant);

    const cdemp = dto.cdemp_iv ?? dto.empven;
    if (!cdemp) {
      throw new BadRequestException('cdemp_iv ou empven deve ser informado.');
    }

    const item = await prisma.t_itens.findFirst({
      where: { cdemp, cditem: dto.cditem_iv },
      select: { deitem: true },
    });

    if (!item?.deitem) {
      throw new NotFoundException(
        `Item ${dto.cditem_iv} nao encontrado para cdemp ${cdemp}.`,
      );
    }

    const data = this.buildItsvenData(dto, item.deitem);

    const record = await prisma.t_itsven.create({ data });
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
      const vendaRecord = await tx.t_vendas.create({
        data: this.buildVendaData(dto),
      });

      const vendaId = vendaRecord.ID ?? null;

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

      const itemsByCdemp = new Map<number, number[]>();
      for (const item of itens) {
        const cdemp = item.cdemp_iv ?? item.empven;
        if (!cdemp) {
          throw new BadRequestException(
            'cdemp_iv ou empven deve ser informado nos itens.',
          );
        }
        const list = itemsByCdemp.get(cdemp) ?? [];
        list.push(item.cditem_iv);
        itemsByCdemp.set(cdemp, list);
      }

      const itemNameMap = new Map<string, string>();
      for (const [cdemp, cditems] of itemsByCdemp.entries()) {
        const uniqueCditems = Array.from(new Set(cditems));
        const records = await tx.t_itens.findMany({
          where: { cdemp, cditem: { in: uniqueCditems } },
          select: { cditem: true, deitem: true },
        });
        for (const record of records) {
          if (record.deitem) {
            itemNameMap.set(`${cdemp}:${record.cditem}`, record.deitem);
          }
        }
      }

      const createdItems: PublicItsvenResponseDto[] = [];
      for (const item of itens) {
        const cdemp = item.cdemp_iv ?? item.empven;
        const deitem = itemNameMap.get(`${cdemp}:${item.cditem_iv}`);
        if (!deitem) {
          throw new NotFoundException(
            `Item ${item.cditem_iv} nao encontrado para cdemp ${cdemp}.`,
          );
        }

        const data = this.buildItsvenData(item, deitem, vendaId);
        const record = await tx.t_itsven.create({ data });
        createdItems.push(this.toItsvenResponse(record));
      }

      return {
        venda: this.toVendaResponse(vendaRecord),
        itens: createdItems,
      };
    });
  }
}
