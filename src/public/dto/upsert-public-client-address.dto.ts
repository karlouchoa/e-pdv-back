import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === ''
    ? undefined
    : Number(value);

export class UpsertPublicClientAddressDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  logradouro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pontoReferencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoLocal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instrucoesEntrega?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  tipoEndereco?: string;
}

