import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateTItpromoDto } from './create-t_itpromo.dto';

export class CreateTItpromoBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTItpromoDto)
  items!: CreateTItpromoDto[];
}
