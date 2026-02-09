import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreatePublicVendaDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Transform(toNumber)
  @IsInt()
  nrven_v!: number;

  @Transform(toNumber)
  @IsInt()
  cdemp_v!: number;

  @IsOptional()
  @IsDateString()
  emisven_v?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdcli_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdfpg_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdtpg_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdven_v?: number;

  @IsOptional()
  @IsString()
  restringe_v?: string;

  @IsOptional()
  @IsDateString()
  przent_v?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdmid?: number;

  @IsOptional()
  @IsString()
  obsven_v?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  totpro_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  totven_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  txfin_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  pdesc_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  vdesc_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  vlfrete_v?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  pesovol_v?: number;

  @IsOptional()
  @IsString()
  status_v?: string;

  @IsString()
  codusu_v!: string;

  @IsOptional()
  @IsString()
  trocreq?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  empcli?: number;

  @IsOptional()
  @IsString()
  horaven_v?: string;

  @IsOptional()
  @IsUUID()
  id_cliente?: string;

  @IsOptional()
  @IsDateString()
  createdat?: string;

  @IsOptional()
  @IsDateString()
  updatedat?: string;
}
