import { Expose } from 'class-transformer';

export class TItensComboResponseDto {
  @Expose()
  AUTOCOD!: number;

  @Expose()
  ID!: string;

  @Expose()
  ID_ITEM!: string;

  @Expose()
  CDITEM!: number;

  @Expose()
  CDGRU!: number;

  @Expose()
  QTDE!: number;

  @Expose()
  ID_SUBGRUPO!: string | null;

  @Expose()
  DEGRU!: string | null;

  @Expose()
  CREATEDAT!: Date;

  @Expose()
  UPDATEDAT!: Date;
}
