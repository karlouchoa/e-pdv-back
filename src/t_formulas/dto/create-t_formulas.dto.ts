import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class FormulaItemPricesDto {
  @IsNumber()
  custo!: number;

  @IsNumber()
  preco!: number;

  @IsNumber()
  precomin!: number;
}

export class FormulaLineDto {
  @IsInt()
  matprima!: number;

  @IsNumber()
  qtdemp!: number;

  @IsString()
  undmp!: string;

  @IsInt()
  empitemmp!: number;

  @IsOptional()
  @IsString()
  deitem_iv?: string;
}

export class CreateTFormulaDto {
  @IsString()
  idItem!: string;

  @IsInt()
  cditem!: number;

  @IsInt()
  empitem!: number;

  @IsString()
  undven!: string;

  @IsOptional()
  @IsBoolean()
  updateItemPrices?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FormulaItemPricesDto)
  itemPrices?: FormulaItemPricesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaLineDto)
  lines!: FormulaLineDto[];
}
