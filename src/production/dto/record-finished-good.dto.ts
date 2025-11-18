import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordFinishedGoodDto {
  @IsString()
  @MaxLength(80)
  product_code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lot_number?: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity_good!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity_scrap?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unit_cost?: number;

  @IsOptional()
  @IsDateString()
  posted_at?: string;
}
