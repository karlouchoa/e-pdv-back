import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTItensComboDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || String(value).trim() === ''
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'cditem deve ser um numero inteiro.' })
  @Min(1, { message: 'cditem deve ser maior que zero.' })
  cditem?: number;

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
      : Number(value),
  )
  @IsInt({ message: 'id_subgrupo deve ser um numero inteiro.' })
  @Min(1, { message: 'id_subgrupo deve ser maior que zero.' })
  id_subgrupo?: number;
}
