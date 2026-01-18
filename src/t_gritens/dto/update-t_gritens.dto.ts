import { PartialType } from '@nestjs/mapped-types';
import { CreateTGritensDto } from './create-t_gritens.dto';

export class UpdateTGritensDto extends PartialType(CreateTGritensDto) {}