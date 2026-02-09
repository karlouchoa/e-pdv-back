import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = (value: unknown) =>
  typeof value === 'string' ? value.trim() : value;

export class PublicContactDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome!: string;

  @Transform(({ value }) => trim(value))
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  telefone!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  empresa!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  segmento!: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  desafio!: string;
}
