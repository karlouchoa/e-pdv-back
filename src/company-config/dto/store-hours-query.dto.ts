import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class StoreHoursQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cdemp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;
}

