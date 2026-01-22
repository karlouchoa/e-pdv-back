import { PartialType } from '@nestjs/mapped-types';
import { CreateTItensComboDto } from './create-t_itenscombo.dto';

export class UpdateTItensComboDto extends PartialType(CreateTItensComboDto) {}
