import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  MinLength,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpsertPublicClientAddressDto } from './upsert-public-client-address.dto';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === ''
    ? undefined
    : Number(value);

export class UpsertPublicClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nome!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  telefone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(60)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cpfCnpj?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  cdemp?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertPublicClientAddressDto)
  endereco?: UpsertPublicClientAddressDto;
}
