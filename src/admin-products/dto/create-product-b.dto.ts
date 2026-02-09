import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { FormulaItemDto } from './formula-item.dto';
import { ProductBaseDto } from './product-base.dto';

export class CreateProductBDto extends ProductBaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaItemDto)
  formulaItems!: FormulaItemDto[];
}
