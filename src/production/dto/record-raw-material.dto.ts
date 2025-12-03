import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordRawMaterialDto {
  @Transform(({ value, obj }) => value ?? obj.componentCode ?? obj.component_code)
  @IsString()
  @MaxLength(80)
  component_code!: string;

  @Transform(({ value, obj }) => (value ?? obj.description ?? '').trim() || undefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @Transform(({ value, obj }) => value ?? obj.quantityUsed ?? obj.quantity_used)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity_used!: number;

  @Transform(({ value, obj }) => value ?? obj.unit)
  @IsString()
  @MaxLength(10)
  unit!: string;

  @Transform(({ value, obj }) => value ?? obj.unitCost ?? obj.unit_cost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unit_cost?: number;

  @Transform(({ value, obj }) => value ?? obj.warehouse)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  warehouse?: string;

  @Transform(({ value, obj }) => value ?? obj.batchNumber ?? obj.batch_number)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch_number?: string;

  @Transform(({ value, obj }) => value ?? obj.consumedAt ?? obj.consumed_at)
  @IsOptional()
  @IsDateString()
  consumed_at?: string;
}
