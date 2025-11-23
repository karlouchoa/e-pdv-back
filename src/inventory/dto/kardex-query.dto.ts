import { IsDateString, IsOptional } from 'class-validator';

export class KardexQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
