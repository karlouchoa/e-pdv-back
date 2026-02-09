import { Expose } from 'class-transformer';

export class OrderStatusHistoryDto {
  @Expose()
  id!: string;

  @Expose()
  vendaId!: string;

  @Expose()
  status!: string;

  @Expose()
  source!: string;

  @Expose()
  note?: string | null;

  @Expose()
  changedBy?: string | null;

  @Expose()
  changedAt!: Date;
}
