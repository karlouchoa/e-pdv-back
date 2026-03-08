import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
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

export class CreateTSubgrDto {
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  cdgru!: number;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  desub!: string;

  @IsOptional()
  @Transform(trimString)
  @IsUUID('all')
  id_grupo?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  idsugr?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  oldcod?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  cdsubext?: number;
}
