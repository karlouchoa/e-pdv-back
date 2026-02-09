import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class RecordTotalOrdersDto {
  @Transform(({ value, obj }) => value ?? obj.ingredients ?? obj.ingredients)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ingredients?: number;

  @Transform(({ value, obj }) => value ?? obj.labor ?? obj.labor)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  labor?: number;

  @Transform(({ value, obj }) => value ?? obj.packaging ?? obj.packaging)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packaging?: number;

  @Transform(({ value, obj }) => value ?? obj.taxes ?? obj.taxes)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxes?: number;

  @Transform(({ value, obj }) => value ?? obj.Overhead ?? obj.Overhead)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  Overhead?: number;

  @Transform(({ value, obj }) => value ?? obj.totalCost ?? obj.totalCost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCost?: number;

  @Transform(({ value, obj }) => value ?? obj.unitCost ?? obj.unitCost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;
}
