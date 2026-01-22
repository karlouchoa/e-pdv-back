import { Expose } from 'class-transformer';

export class PublicItsvenResponseDto {
  @Expose()
  registro!: number;

  @Expose()
  id?: string | null;

  @Expose()
  id_venda?: string | null;

  @Expose()
  empven!: number;

  @Expose()
  nrven_iv!: number;

  @Expose()
  cdemp_iv?: number | null;

  @Expose()
  cditem_iv!: number;

  @Expose()
  deitem_iv?: string | null;

  @Expose()
  unditem_iv?: string | null;

  @Expose()
  comgru_iv?: number | null;

  @Expose()
  precmin_iv?: number | null;

  @Expose()
  precven_iv?: number | null;

  @Expose()
  precpra_iv?: number | null;

  @Expose()
  qtdesol_iv?: number | null;

  @Expose()
  perdes_iv?: number | null;

  @Expose()
  codcst_iv?: string | null;

  @Expose()
  emisven_iv!: Date;

  @Expose()
  status_iv?: string | null;

  @Expose()
  cdven_iv?: number | null;

  @Expose()
  pesobr_iv?: number | null;

  @Expose()
  compra_iv?: number | null;

  @Expose()
  custo_iv?: number | null;

  @Expose()
  st?: string | null;

  @Expose()
  mp?: string | null;
}
