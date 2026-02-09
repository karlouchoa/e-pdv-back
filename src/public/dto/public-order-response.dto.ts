import { Expose, Type } from 'class-transformer';

export class PublicOrderItemDto {
  @Expose()
  id?: string | null;

  @Expose()
  cditem?: number | null;

  @Expose()
  description?: string | null;

  @Expose()
  quantity!: number;

  @Expose()
  unitPrice!: number;

  @Expose()
  total!: number;
}

export class PublicOrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  status!: string;

  @Expose()
  subtotal!: number;

  @Expose()
  discountValue!: number;

  @Expose()
  total!: number;

  @Expose()
  createdAt?: Date | null;

  @Expose()
  @Type(() => PublicOrderItemDto)
  items!: PublicOrderItemDto[];
}
