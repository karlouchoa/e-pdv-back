import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  isNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  isString,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class MovementDocumentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  number?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  type?: string;
}

export class CreateMovementDto {
  @IsOptional()
  @IsString()
  itemId!: string;

  @IsNotEmpty()
  @IsIn(['E', 'S', 'e', 's'])
  type!: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  unitPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MovementDocumentDto)
  document?: MovementDocumentDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  notes?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerOrSupplier?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
