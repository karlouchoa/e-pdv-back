import { Expose } from 'class-transformer';

export class PublicVendaResponseDto {
  @Expose()
  autocod_v!: number;

  @Expose()
  id?: string | null;

  @Expose()
  nrven_v!: number;

  @Expose()
  cdemp_v!: number;

  @Expose()
  emisven_v?: Date | null;

  @Expose()
  cdcli_v?: number | null;

  @Expose()
  cdfpg_v?: number | null;

  @Expose()
  cdtpg_v?: number | null;

  @Expose()
  cdven_v?: number | null;

  @Expose()
  restringe_v?: string | null;

  @Expose()
  przent_v?: Date | null;

  @Expose()
  cdmid?: number | null;

  @Expose()
  obsven_v?: string | null;

  @Expose()
  totven_v?: number | null;

  @Expose()
  pdesc_v?: number | null;

  @Expose()
  vdesc_v?: number | null;

  @Expose()
  pesovol_v?: number | null;

  @Expose()
  status_v?: string | null;

  @Expose()
  codusu_v!: string;

  @Expose()
  trocreq?: string | null;

  @Expose()
  empcli?: number | null;

  @Expose()
  horaven_v?: string | null;

  @Expose()
  id_cliente?: string | null;

  @Expose()
  createdat?: Date | null;

  @Expose()
  updatedat?: Date | null;
}
