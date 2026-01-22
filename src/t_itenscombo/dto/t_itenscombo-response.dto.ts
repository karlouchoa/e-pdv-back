import { Expose } from 'class-transformer';

export class TItensComboResponseDto {
  @Expose()
  AUTOCOD!: number;

  @Expose()
  ID!: string;

  @Expose()
  ID_ITEM!: string;

  @Expose()
  CDGRU!: number;

  @Expose()
  QTDE!: number;

  @Expose()
  CREATEDAT!: Date;

  @Expose()
  UPDATEDAT!: Date;
}
