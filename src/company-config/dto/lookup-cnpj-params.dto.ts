import { IsString, MaxLength } from 'class-validator';

export class LookupCnpjParamsDto {
  @IsString()
  @MaxLength(32)
  cnpj!: string;
}
