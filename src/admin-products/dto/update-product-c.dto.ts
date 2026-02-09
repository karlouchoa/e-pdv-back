import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ComboRuleDto } from './combo-rule.dto';
import { UpdateProductBaseDto } from './product-base.dto';

export class UpdateProductCDto extends UpdateProductBaseDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboRuleDto)
  comboRules?: ComboRuleDto[];
}
