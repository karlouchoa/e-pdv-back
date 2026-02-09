import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionOrderDto } from './create-production-order.dto';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProductionOrderDto extends PartialType(
  CreateProductionOrderDto,
) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'quantity_planned must be a number' },
  )
  @Min(0)
  quantity_planned?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}
