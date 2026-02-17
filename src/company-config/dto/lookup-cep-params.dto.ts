import { IsString, MaxLength } from 'class-validator';

export class LookupCepParamsDto {
  @IsString()
  @MaxLength(16)
  cep!: string;
}
