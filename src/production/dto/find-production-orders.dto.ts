import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindProductionOrdersQueryDto {
  @Transform(({ value, obj }) => value ?? obj.externalCode ?? obj.external_code)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  external_code?: string;

  @Transform(({ value, obj }) => value ?? obj.productCode ?? obj.product_code)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  product_code?: string;
}
