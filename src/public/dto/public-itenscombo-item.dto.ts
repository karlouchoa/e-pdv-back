import { Expose } from 'class-transformer';

export class PublicItensComboItemDto {
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
  ID_SUBGRUPO!: string | null;

  @Expose()
  DEGRU!: string | null;

  @Expose()
  NEGATIVO!: string | null;

  @Expose()
  SALDO!: number | null;

  @Expose()
  CREATEDAT!: Date;

  @Expose()
  UPDATEDAT!: Date;
}
