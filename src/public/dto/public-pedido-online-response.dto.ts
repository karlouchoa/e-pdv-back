import { Expose, Type } from 'class-transformer';

export class PublicPedidoOnlineComboChoiceResponseDto {
  @Expose()
  idItemEscolhido!: string;

  @Expose()
  cdgru!: number;

  @Expose()
  quantity!: number;
}

export class PublicPedidoOnlineItemResponseDto {
  @Expose()
  id!: string;

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
  idPedidoOnline!: string;

  @Expose()
  status!: string;

  @Expose()
  publicToken?: string | null;

  @Expose()
  @Type(() => PublicPedidoOnlineTotalsDto)
  totals!: PublicPedidoOnlineTotalsDto;

  @Expose()
  @Type(() => PublicPedidoOnlineItemResponseDto)
  items!: PublicPedidoOnlineItemResponseDto[];
}
