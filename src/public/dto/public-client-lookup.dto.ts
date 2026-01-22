import { IsOptional, IsString } from 'class-validator';

export class PublicClientLookupDto {
  @IsOptional()
  @IsString()
  termo?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
