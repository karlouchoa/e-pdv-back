import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
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
  @IsString()
  @IsNotEmpty()
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
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  totalValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  notes?: string;

  @IsString()
  @IsNotEmpty()
  warehouse!: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  customerOrSupplier!: number;

  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  codusu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  user?: string;
}
