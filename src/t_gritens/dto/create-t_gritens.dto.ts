import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class CreateTGritensDto {
  @IsString()
  @IsNotEmpty()
  degru!: string; // Descrição do grupo (Obrigatório)

  @IsOptional()
  @IsString()
  ativo?: string; // Se está ativo ('S' ou 'N' geralmente)

  // Campos Decimais: Transformamos para Number para validar
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  perccomgru?: number;

}