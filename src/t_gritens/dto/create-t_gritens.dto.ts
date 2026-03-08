import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString().trim();
  }

  return undefined;
};

const toNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const toSN = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value ? 'S' : 'N';
  }

  if (typeof value === 'string') {
    return value.trim().toUpperCase();
  }

  return value;
};

export class CreateTGritensDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trimString)
  degru!: string;

  @IsOptional()
  @IsString()
  @IsIn(['S', 'N'])
  @Transform(toSN)
  ativo?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  perccomgru?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  comlinha?: number;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  impressoradaseparacao?: string;
}
