import { Expose } from 'class-transformer';

export class PublicTpgtoDto {
  @Expose()
  cdtpg!: number;

  @Expose()
  detpg?: string | null;

  @Expose()
  quitpg?: string | null;

  @Expose()
  peddoc?: string | null;

  @Expose()
  taxa_adm?: number | null;

  @Expose()
  codred?: number | null;

  @Expose()
  codimpfiscal?: string | null;

  @Expose()
  lancacx?: string | null;

  @Expose()
  ctataxa?: number | null;

  @Expose()
  fortaxa?: number | null;

  @Expose()
  naocomis?: string | null;

  @Expose()
  dup_por_parccnd?: string | null;

  @Expose()
  cdclicart?: string | null;

  @Expose()
  intdiascart?: number | null;

  @Expose()
  complcheq?: string | null;

  @Expose()
  transtef?: string | null;

  @Expose()
  pedesenha?: string | null;

  @Expose()
  promosn?: string | null;

  @Expose()
  tpg_inad?: string | null;

  @Expose()
  tpg_txa?: number | null;

  @Expose()
  ativosn?: string | null;

  @Expose()
  descmax?: number | null;

  @Expose()
  negadesc?: string | null;

  @Expose()
  dtalttpg?: Date | null;

  @Expose()
  cdfor?: number | null;

  @Expose()
  empfor?: number | null;

  @Expose()
  tipo?: string | null;

  @Expose()
  comrecsn?: string | null;

  @Expose()
  cdtpgext?: number | null;

  @Expose()
  TEF?: string | null;

  @Expose()
  PIX?: string | null;

  @Expose()
  CreatedAt!: Date;

  @Expose()
  UpdatedAt!: Date;

  @Expose()
  ID?: string | null;

  @Expose()
  OnLineSN?: string | null;
}
