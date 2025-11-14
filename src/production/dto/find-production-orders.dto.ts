import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindProductionOrdersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  external_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  product_code?: string;
}
