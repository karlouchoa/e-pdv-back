import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTItensComboDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID('all', { message: 'id_item deve ser um UUID valido.' })
  @IsString()
  @IsNotEmpty()
  id_item!: string;

  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'cdgru (codigo do subgrupo) deve ser um numero inteiro.' })
  @Min(1, { message: 'cdgru (codigo do subgrupo) deve ser maior que zero.' })
  cdgru!: number;

  @Transform(({ value }) => Number(value))
  @Min(0.01, { message: 'qtde deve ser maior que zero.' })
  qtde!: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || String(value).trim() === ''
      ? undefined
      : String(value).trim(),
  )
  @IsUUID('all', { message: 'id_subgrupo deve ser um UUID valido.' })
  id_subgrupo?: string;
}
