import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

const trimString = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString().trim();
  }

  if (value instanceof Date) {
    return value.toISOString().trim();
  }

  return undefined;
};

const toNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export class ProductBaseDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trimString)
  name!: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  description?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  unit?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  category?: number;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  brand?: string;

  @IsNumber()
  @Transform(toNumber)
  @Min(0)
  salePrice!: number;

  @IsOptional()
  @IsNumber()
  @Transform(toNumber)
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  qtembitem?: number;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  ncm?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  cest?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  cst?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  barcode?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  notes?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  imagePath?: string;

  @IsIn(['S', 'N'])
  @Transform(trimString)
  active!: string;
}

export class UpdateProductBaseDto extends PartialType(ProductBaseDto) {}
