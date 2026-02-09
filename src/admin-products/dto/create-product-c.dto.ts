import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ComboRuleDto } from './combo-rule.dto';
import { ProductBaseDto } from './product-base.dto';

export class CreateProductCDto extends ProductBaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboRuleDto)
  comboRules!: ComboRuleDto[];
}
