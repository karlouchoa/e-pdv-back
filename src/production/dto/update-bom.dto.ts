import { Transform, Type } from 'class-transformer';
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
  @Transform(({ value, obj }) => value ?? obj.product_code ?? obj.productCode)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  productCode?: string;

  @Transform(({ value, obj }) => value ?? obj.version)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @Transform(({ value, obj }) => value ?? obj.lotSize ?? obj.lot_size)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.0001)
  lotSize?: number;

  @Transform(({ value, obj }) => value ?? obj.validityDays ?? obj.validity_days)
  @IsOptional()
  @IsInt()
  @Min(0)
  validityDays?: number;

  @Transform(({ value, obj }) => value ?? obj.marginTarget ?? obj.margin_target)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginTarget?: number;

  @Transform(
    ({ value, obj }) => value ?? obj.marginAchieved ?? obj.margin_achieved,
  )
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
  @Transform(({ value, obj }) => value ?? obj.bom_items ?? obj.items)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items?: BomItemDto[];
}
