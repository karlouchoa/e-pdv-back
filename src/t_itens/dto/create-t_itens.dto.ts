import { Transform } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsNotEmpty,
} from "class-validator";

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsIn(["S", "N"])
  itprodsn?: string;

  @IsOptional()
  @IsIn(["S", "N"])
  matprima?: string;
}
