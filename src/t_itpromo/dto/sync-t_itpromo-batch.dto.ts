import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

const toOptionalNumber = ({ value }: { value: unknown }) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export class SyncTItpromoBatchItemDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  empromo?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cdpromo?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cditem?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  preco?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  precomin?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  precopromo?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  meta?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  empitem?: number | null;

  @IsOptional()
  @IsString()
  undven?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  custo?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  autocodext?: number | null;

  @IsOptional()
  @IsString()
  hostname?: string | null;

  @IsOptional()
  @IsString()
  ip?: string | null;

  @IsOptional()
  @IsDateString()
  DATA_PROMO?: string | null;

  @IsOptional()
  @IsUUID()
  ID_ITEM?: string | null;

  @IsOptional()
  @IsUUID()
  id_item?: string | null;

  @IsOptional()
  @IsDateString()
  CreatedAt?: string | null;

  @IsOptional()
  @IsDateString()
  createdat?: string | null;

  @IsOptional()
  @IsDateString()
  UpdatedAt?: string | null;

  @IsOptional()
  @IsDateString()
  updatedat?: string | null;
}

export class SyncTItpromoEmpresaBatchDto {
  @Transform(toOptionalNumber)
  @IsNumber()
  cdemp!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItpromoBatchItemDto)
  items!: SyncTItpromoBatchItemDto[];
}

export class SyncTItpromoBatchDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItpromoBatchItemDto)
  items?: SyncTItpromoBatchItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItpromoEmpresaBatchDto)
  Empresa?: SyncTItpromoEmpresaBatchDto[];
}

export class SyncTItpromoBatchResultItemDto {
  @Expose()
  id!: string;

  @Expose()
  action!: 'INSERTED' | 'UPDATED' | 'SKIPPED' | 'ERROR';

  @Expose()
  message!: string;
}

export class SyncTItpromoBatchResponseDto {
  @Expose()
  total!: number;

  @Expose()
  inserted!: number;

  @Expose()
  updated!: number;

  @Expose()
  skipped!: number;

  @Expose()
  errors!: number;

  @Expose()
  @Type(() => SyncTItpromoBatchResultItemDto)
  results!: SyncTItpromoBatchResultItemDto[];
}
