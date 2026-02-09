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
  @Transform(
    ({ value, obj }) => value ?? obj.componentCode ?? obj.component_code,
  )
  @IsString()
  @MaxLength(80)
  component_code!: string;

  @Transform(
    ({ value, obj }) => (value ?? obj.description ?? '').trim() || undefined,
  )
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

  @Transform(
    ({ value, obj }) =>
      value ??
      obj.unit_price ??
      obj.price ??
      obj.preco ??
      obj.unitCost ??
      obj.unit_cost,
  )
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unit_price?: number;

  @Transform(
    ({ value, obj }) =>
      value ?? obj.value ?? obj.totalValue ?? obj.total_value ?? obj.valor,
  )
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  value?: number;

  @Transform(({ value, obj }) => {
    const w = value ?? obj.warehouse ?? obj?.wharehouse;
    return w == null ? undefined : String(w).trim();
  })
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
