import { PartialType } from '@nestjs/mapped-types';
import { CreateTFormulaDto } from './create-t_formulas.dto';

export class UpdateTFormulaDto extends PartialType(CreateTFormulaDto) {}
