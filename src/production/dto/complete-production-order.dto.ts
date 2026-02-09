import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CompleteProductionOrderDto {
  @Transform(({ value, obj }) => value ?? obj.productCode ?? obj.product_code)
  @IsString()
  @MaxLength(80)
  product_code!: string;

  @Transform(
    ({ value, obj }) =>
      value ?? obj.quantity ?? obj.quantity_good ?? obj.quantityGood,
  )
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.0001)
  quantity!: number;

  @Transform(({ value, obj }) => value ?? obj.unitCost ?? obj.unit_cost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unit_cost?: number;

  @Transform(({ value, obj }) => value ?? obj.warehouse ?? obj.wharehouse)
  @IsString()
  @MaxLength(80)
  warehouse!: string;

  @Transform(({ value, obj }) => value ?? obj.lotNumber ?? obj.lot_number)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lot_number?: string;

  @Transform(({ value, obj }) => value ?? obj.postedAt ?? obj.posted_at)
  @IsOptional()
  @IsDateString()
  posted_at?: string;

  @Transform(({ value, obj }) => value ?? obj.user ?? obj.codusu)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  user?: string;

  @Transform(({ value, obj }) => value ?? obj.responsible)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsible?: string;

  @Transform(({ value, obj }) => value ?? obj.notes ?? obj.remarks)
  @IsOptional()
  @IsString()
  notes?: string;
}
