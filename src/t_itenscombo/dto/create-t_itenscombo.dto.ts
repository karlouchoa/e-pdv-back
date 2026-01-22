import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTItensComboDto {
  @IsString()
  @IsNotEmpty()
  id_item!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  cdgru!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  qtde!: number;
}
