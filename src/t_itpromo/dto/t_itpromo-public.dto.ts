import { Expose } from 'class-transformer';

export class TItpromoPublicDto {
  @Expose()
  EMPROMO!: number | null;

  @Expose()
  CDITEM!: number | null;

  @Expose()
  DEITEM!: string | null;

  @Expose()
  UNDVEN!: string | null;

  @Expose()
  PRECO!: number | null;

  @Expose()
  PRECOPROMO!: number | null;

  @Expose()
  DATA_PROMO!: Date | null;

  @Expose()
  CDEMP!: number | null;

  @Expose()
  PRECOMIN!: number | null;

  @Expose()
  CUSTO!: number | null;
}
