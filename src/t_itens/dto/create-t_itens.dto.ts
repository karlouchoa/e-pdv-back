import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

const toNullableNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export class ItemImageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateTItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(toNullableNumber)
  @IsNumber()
  subgroup?: number | null;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  valcmp?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  qtembitem?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  margem?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;

  @IsOptional()
  @IsString()
  cst?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsBoolean()
  isComposed?: boolean;

  @IsOptional()
  @IsBoolean()
  isRawMaterial?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isNegative?: boolean;

  @IsOptional()
  @IsBoolean()
  isCombo?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemImageDto)
  images?: ItemImageDto[];

  @IsOptional()
  @IsIn(['S', 'N'])
  itprodsn?: string;

  @IsOptional()
  @IsIn(['S', 'N'])
  matprima?: string;

  @IsOptional()
  @IsIn(['S', 'N'])
  ativosn?: string;

  @IsOptional()
  @IsIn(['S', 'N'])
  negativo?: string;

  @IsOptional()
  @IsIn(['S', 'N'])
  ComboSN?: string;

  @IsOptional()
  @IsIn(['S', 'N'])
  combosn?: string;
}
