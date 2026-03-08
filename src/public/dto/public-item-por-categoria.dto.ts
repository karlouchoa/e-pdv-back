import { Expose } from 'class-transformer';

export class PublicItemPorCategoriaDto {
  @Expose()
  ID!: string | null;

  @Expose()
  CDITEM!: number;

  @Expose()
  DEITEM!: string | null;

  @Expose()
  DEFAT!: string | null;

  @Expose()
  UNDVEN!: string | null;

  @Expose()
  PRECO!: number | null;

  @Expose()
  CDGRUIT!: number | null;

  @Expose()
  SUBGRU!: number | null;

  @Expose()
  ID_SUBGRUPO!: string | null;

  @Expose()
  NEGATIVO!: string | null;

  @Expose()
  SALDO!: number | null;

  @Expose()
  URL!: string | null;
}
