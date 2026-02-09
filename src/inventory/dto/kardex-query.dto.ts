import { IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class KardexQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cdemp?: number;

  @IsOptional()
  warehouse?: string;
}
