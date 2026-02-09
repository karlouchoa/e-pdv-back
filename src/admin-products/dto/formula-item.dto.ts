import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

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

  if (value instanceof Date) {
    return value.toISOString().trim();
  }

  return undefined;
};

export class FormulaItemDto {
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  matprimaId?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  cditem_matprima?: number;

  @IsNumber()
  @Transform(toNumber)
  @Min(0.000001)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @Transform(trimString)
  unit!: string;
}
