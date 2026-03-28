import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matprima!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  qtdemp!: number;

  @IsString()
  undmp!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  empitemmp!: number;

  @IsOptional()
  @IsString()
  deitem_iv?: string;
}

export class CreateTFormulaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idItem?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cditem!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
