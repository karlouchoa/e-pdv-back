import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value, obj }) => value ?? obj.product_code ?? obj.productCode)
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  productCode!: string;

  @Transform(({ value, obj }) => value ?? obj.version)
  @IsString()
  @MaxLength(20)
  @IsNotEmpty()
  version!: string;

  @Transform(({ value, obj }) => value ?? obj.lotSize ?? obj.lot_size)
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.0001)
  lotSize!: number;

  @Transform(({ value, obj }) => value ?? obj.validityDays ?? obj.validity_days)
  @IsInt()
  @Min(0)
  validityDays!: number;

  @Transform(({ value, obj }) => value ?? obj.marginTarget ?? obj.margin_target)
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginTarget!: number;

  @Transform(
    ({ value, obj }) => value ?? obj.marginAchieved ?? obj.margin_achieved,
  )
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  marginAchieved!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @Transform(({ value, obj }) => value ?? obj.bom_items ?? obj.items)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items!: BomItemDto[];
}
