import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === ''
    ? undefined
    : Number(value);

export class PublicClientLookupDto {
  @IsOptional()
  @IsString()
  termo?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  cdemp?: number;
}
