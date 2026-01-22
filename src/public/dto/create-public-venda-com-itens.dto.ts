import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreatePublicItsvenDto } from './create-public-itsven.dto';
import { CreatePublicVendaDto } from './create-public-venda.dto';

export class CreatePublicVendaComItensDto {
  @ValidateNested()
  @Type(() => CreatePublicVendaDto)
  venda!: CreatePublicVendaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicItsvenDto)
  itens!: CreatePublicItsvenDto[];
}
