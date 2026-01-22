import { PartialType } from '@nestjs/mapped-types';
import { CreateTItpromoDto } from './create-t_itpromo.dto';

export class UpdateTItpromoDto extends PartialType(CreateTItpromoDto) {}
