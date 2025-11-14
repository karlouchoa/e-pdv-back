import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BomItemDto } from './bom-item.dto';

export class CreateBomDto {
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  productCode: string;

  @IsString()
  @MaxLength(20)
  @IsNotEmpty()
  version: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.0001)
  lotSize: number;

  @IsInt()
  @Min(0)
  validityDays: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginTarget: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginAchieved: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items: BomItemDto[];
}
