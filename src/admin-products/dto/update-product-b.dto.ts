import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { FormulaItemDto } from './formula-item.dto';
import { UpdateProductBaseDto } from './product-base.dto';

export class UpdateProductBDto extends UpdateProductBaseDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaItemDto)
  formulaItems?: FormulaItemDto[];
}
