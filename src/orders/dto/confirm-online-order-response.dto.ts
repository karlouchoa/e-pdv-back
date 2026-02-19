import { Expose, Type } from 'class-transformer';

export class ConfirmOnlineOrderTotalsDto {
  @Expose()
  subtotal!: number;

  @Expose()
  discount!: number;

  @Expose()
  deliveryFee!: number;

  @Expose()
  total!: number;
}

export class ConfirmOnlineOrderItemsSummaryDto {
  @Expose()
  parentLines!: number;

  @Expose()
  componentLines!: number;
}

export class ConfirmOnlineOrderResponseDto {
  @Expose()
  idPedidoOnline!: string;

  @Expose()
  pedido!: number;

  @Expose()
  numeroPedido!: number;

  @Expose()
  sinalCliente!: string;

  @Expose()
  status!: string;

  @Expose()
  idVenda!: string | null;

  @Expose()
  @Type(() => ConfirmOnlineOrderTotalsDto)
  totals!: ConfirmOnlineOrderTotalsDto;

  @Expose()
  @Type(() => ConfirmOnlineOrderItemsSummaryDto)
  insertedLines!: ConfirmOnlineOrderItemsSummaryDto;
}
