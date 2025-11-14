import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductionOrderDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  external_code: string;

  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  product_code: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'quantity_planned must be a number' })
  @Min(0)
  quantity_planned: number;

  @IsString()
  @MaxLength(10)
  @IsNotEmpty()
  unit: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  due_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
