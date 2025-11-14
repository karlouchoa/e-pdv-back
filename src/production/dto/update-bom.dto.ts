import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BomItemDto } from './bom-item.dto';

export class UpdateBomDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  productCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.0001)
  lotSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  validityDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginAchieved?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items?: BomItemDto[];
}
