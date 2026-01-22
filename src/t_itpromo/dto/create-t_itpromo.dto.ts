import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreateTItpromoDto {
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  empromo?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  cdpromo?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  cditem?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  preco?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  precomin?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  precopromo?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  meta?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  empitem?: number;

  @IsOptional()
  @IsString()
  undven?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  custo?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  autocodext?: number;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsDateString()
  data_promo?: string;

  @IsOptional()
  @IsString()
  id_item?: string;
}
