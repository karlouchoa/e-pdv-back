import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const parseBooleanValue = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 's', 'sim', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'n', 'nao', 'no'].includes(normalized)) return false;
  return value;
};

export class CreateStoreHourDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  day?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  openingTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  abertura?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  closeTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  closingTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  fechamento?: string;

  @IsOptional()
  @Transform(parseBooleanValue)
  @IsBoolean()
  isClosed?: boolean;

  @IsOptional()
  @Transform(parseBooleanValue)
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @Transform(parseBooleanValue)
  @IsBoolean()
  fechado?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  storeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  empresaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  id_empresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  companyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  storeCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cdemp?: number;
}
