import { PartialType } from '@nestjs/mapped-types';
import { CreateTSubgrDto } from './create-t_subgr.dto';

export class UpdateTSubgrDto extends PartialType(CreateTSubgrDto) {}
