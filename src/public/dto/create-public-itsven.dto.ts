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

export class CreatePublicItsvenDto {
  @IsOptional()
  @IsUUID()
  id_venda?: string;

  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdemp_iv?: number;

  @Transform(toNumber)
  @IsInt()
  nrven_iv!: number;

  @Transform(toNumber)
  @IsInt()
  empven!: number;

  @Transform(toNumber)
  @IsInt()
  cditem_iv!: number;

  @IsOptional()
  @IsString()
  unditem_iv?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  comgru_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  precmin_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  precven_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  precpra_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  qtdesol_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  perdes_iv?: number;

  @IsOptional()
  @IsString()
  codcst_iv?: string;

  @IsDateString()
  emisven_iv!: string;

  @IsOptional()
  @IsString()
  status_iv?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdven_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  pesobr_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  compra_iv?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  custo_iv?: number;

  @IsOptional()
  @IsString()
  st?: string;

  @IsOptional()
  @IsString()
  mp?: string;
}
