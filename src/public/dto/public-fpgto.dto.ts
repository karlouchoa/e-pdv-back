import { Expose } from 'class-transformer';

export class PublicFpgtoDto {
  @Expose()
  cdfpg!: number;

  @Expose()
  defpg?: string | null;

  @Expose()
  restrv?: string | null;

  @Expose()
  disp_bloq?: string | null;

  @Expose()
  codred?: number | null;

  @Expose()
  impexpsn?: string | null;

  @Expose()
  dispven?: string | null;

  @Expose()
  enviapalm?: string | null;

  @Expose()
  codtab?: number | null;

  @Expose()
  ativosn?: string | null;

  @Expose()
  dtaltfpg?: Date | null;

  @Expose()
  cdfpgext?: number | null;

  @Expose()
  CreatedAt!: Date;

  @Expose()
  UpdatedAt!: Date;

  @Expose()
  ID?: string | null;

  @Expose()
  OnLineSN?: string | null;
}
