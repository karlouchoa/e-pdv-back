import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class MovementFiltersDto {
  @IsNotEmpty()
  @IsIn(['E', 'S', 'e', 's'])
  type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cdemp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemId?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
