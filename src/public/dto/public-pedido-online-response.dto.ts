import { Expose, Type } from 'class-transformer';

export class PublicPedidoOnlineComboChoiceResponseDto {
  @Expose()
  idItemEscolhido!: number;

  @Expose()
  cdgru!: number;

  @Expose()
  quantity!: number;
}

export class PublicPedidoOnlineItemResponseDto {
  @Expose()
  id!: number;

  @Expose()
  idItem!: string;

  @Expose()
  cditem!: number;

  @Expose()
  description!: string;

  @Expose()
  quantity!: number;

  @Expose()
  unitPrice!: number;

  @Expose()
  total!: number;

  @Expose()
  isCombo!: boolean;

  @Expose()
  @Type(() => PublicPedidoOnlineComboChoiceResponseDto)
  comboChoices?: PublicPedidoOnlineComboChoiceResponseDto[];
}

export class PublicPedidoOnlineTotalsDto {
  @Expose()
  subtotal!: number;

  @Expose()
  discount!: number;

  @Expose()
  deliveryFee!: number;

  @Expose()
  total!: number;
}

export class PublicPedidoOnlineResponseDto {
  @Expose()
  idPedidoOnline!: number;

  @Expose()
  pedido!: number;

  @Expose()
  status!: string;

  @Expose()
  publicToken?: string | null;

  @Expose()
  tipoPagto?: string | null;

  @Expose()
  trocoPara?: number;

  @Expose()
  @Type(() => PublicPedidoOnlineTotalsDto)
  totals!: PublicPedidoOnlineTotalsDto;

  @Expose()
  @Type(() => PublicPedidoOnlineItemResponseDto)
  items!: PublicPedidoOnlineItemResponseDto[];
}
