import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordRawMaterialDto {
  @IsString()
  @MaxLength(80)
  component_code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity_used!: number;

  @IsString()
  @MaxLength(10)
  unit!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unit_cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  warehouse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch_number?: string;

  @IsOptional()
  @IsDateString()
  consumed_at?: string;
}
