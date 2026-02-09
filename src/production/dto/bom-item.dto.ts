import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class BomItemDto {
  @Transform(
    ({ value, obj }) => value ?? obj.component_code ?? obj.componentCode,
  )
  @IsString()
  @MaxLength(80)
  componentCode!: string;

  @Transform(
    ({ value, obj }) => (value ?? obj.description ?? '').trim() || undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @Transform(({ value, obj }) => value ?? obj.unitCost ?? obj.unit_cost)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  unitCost!: number;

  // 👇 quantityBase agora mapeia corretamente quantity do frontend
  @Transform(({ obj }) => obj.quantity_base ?? 0)
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity_base?: number;

  // 👇 perct agora mapeia corretamente percentage do frontend
  @Transform(({ obj }) => obj.fator ?? 100)
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  fator?: number;
}
