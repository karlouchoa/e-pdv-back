import { Expose } from 'class-transformer';

export class TItpromoRecordDto {
  @Expose()
  autocod!: number;

  @Expose()
  empromo?: number | null;

  @Expose()
  cdpromo?: number | null;

  @Expose()
  cditem?: number | null;

  @Expose()
  preco?: number | null;

  @Expose()
  precomin?: number | null;

  @Expose()
  precopromo?: number | null;

  @Expose()
  meta?: number | null;

  @Expose()
  empitem?: number | null;

  @Expose()
  undven?: string | null;

  @Expose()
  custo?: number | null;

  @Expose()
  autocodext?: number | null;

  @Expose()
  hostname?: string | null;

  @Expose()
  ip?: string | null;

  @Expose()
  CreatedAt!: Date;

  @Expose()
  UpdatedAt!: Date;

  @Expose()
  DATA_PROMO?: Date | null;

  @Expose()
  ID_ITEM?: string | null;
}
