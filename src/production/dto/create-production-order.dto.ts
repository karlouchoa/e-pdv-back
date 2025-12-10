import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { RecordRawMaterialDto } from './record-raw-material.dto';
export class CreateProductionOrderDto {
  @Transform(({ value, obj }) => value ?? obj.productCode)
  @IsString()
  product_code!: string;

  @Transform(({ value, obj }) => value ?? obj.quantityPlanned)
  @Type(() => Number)
  quantity_planned!: number;

  @IsString()
  unit!: string;

  @Transform(({ value, obj }) => value ?? obj.startDate)
  @IsDateString()
  start_date!: string;

  @Transform(({ value, obj }) => value ?? obj.dueDate)
  @IsDateString()
  due_date!: string;

  @Transform(({ value, obj }) => value ?? obj.externalCode)
  @IsOptional()
  @IsString()
  external_code?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value, obj }) => value ?? obj.bomId)
  @IsString()
  bom_id!: string;

  @Type(() => Number)
  @IsOptional()
  lote?: number;

  @Transform(({ value, obj }) => value ?? obj.validate)
  @IsOptional()
  @IsDateString()
  validate?: string;

  @Transform(({ value, obj }) => value ?? obj.customValidateDate)
  @IsOptional()
  @IsDateString()
  custom_validate_date?: string;

  @Transform(({ value, obj }) =>
    (value ?? obj.author_user ?? obj.authoruser ?? '').trim() || undefined,
  )
  @IsOptional()
  @IsString()
  author_user?: string;

  @Type(() => Number)
  boxes_qty!: number;

  @Type(() => Number)
  box_cost!: number;

  @Type(() => Number)
  labor_per_unit!: number;

  @Type(() => Number)
  sale_price!: number;

  @Type(() => Number)
  markup!: number;

  @Type(() => Number)
  post_sale_tax!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordRawMaterialDto)
  raw_materials!: RecordRawMaterialDto[];
}
