import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
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

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 't', 's', 'sim', 'y', 'yes'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'f', 'n', 'nao', 'não', 'no'].includes(normalized)) {
      return false;
    }
  }
  return value;
};

export class SyncTItensFormulaDto {
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cditem?: number | null;

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
  matprima?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  qtdemp?: number | null;

  @IsOptional()
  @IsString()
  undmp?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  empitemmp?: number | null;

  @IsOptional()
  @IsString()
  deitem_iv?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cdemp?: number | null;

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

  @IsOptional()
  @IsUUID()
  ID_ITEM?: string | null;

  @IsOptional()
  @IsUUID()
  id_item?: string | null;

  @IsOptional()
  @IsUUID()
  ID_MATPRIMA?: string | null;

  @IsOptional()
  @IsUUID()
  id_matprima?: string | null;
}

export class SyncTItensBatchItemDto {
  @IsUUID()
  ID!: string;

  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  ID_EMPRESA?: string | null;

  @IsOptional()
  @IsUUID()
  id_empresa?: string | null;

  @IsOptional()
  @IsUUID()
  ID_EMPRESA_SALDO?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cdemp?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cditem?: number | null;

  @IsOptional()
  @IsString()
  deitem?: string | null;

  @IsOptional()
  @IsString()
  defat?: string | null;

  @IsOptional()
  @IsString()
  undven?: string | null;

  @IsOptional()
  @IsString()
  mrcitem?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  qtembitem?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  cdgruit?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  pesobr?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  pesolq?: number | null;

  @IsOptional()
  @IsString()
  medcmp?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  eminitem?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  emaxitem?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  percipi?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  valcmp?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  precomin?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  preco?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  precoatac?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  percom?: number | null;

  @IsOptional()
  @IsDateString()
  ultcmp?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  sldatual?: number | null;

  @IsOptional()
  @IsString()
  barcodeit?: string | null;

  @IsOptional()
  @IsDateString()
  datacadit?: string | null;

  @IsOptional()
  @IsString()
  locfotitem?: string | null;

  @IsOptional()
  @IsString()
  usucadit?: string | null;

  @IsOptional()
  @IsString()
  negativo?: string | null;

  @IsOptional()
  @IsString()
  ativosn?: string | null;

  @IsOptional()
  @IsString()
  codcst?: string | null;

  @IsOptional()
  @IsString()
  aceitadesc?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  custo?: number | null;

  @IsOptional()
  @IsString()
  clasfis?: string | null;

  @IsOptional()
  @IsString()
  codncm?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  margem?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  margematac?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  diasent?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  saldoultent?: number | null;

  @IsOptional()
  @IsDateString()
  dataultent?: string | null;

  @IsOptional()
  @IsString()
  pedcomplsn?: string | null;

  @IsOptional()
  @IsString()
  ativoprod?: string | null;

  @IsOptional()
  @IsString()
  enderecoit?: string | null;

  @IsOptional()
  @IsString()
  obsitem?: string | null;

  @IsOptional()
  @IsDateString()
  prvcheg?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  qtdeprvche?: number | null;

  @IsOptional()
  @IsString()
  liberadocomsenha?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  empit?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  subgru?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  familiait?: number | null;

  @IsOptional()
  @IsDateString()
  dtalteracao?: string | null;

  @IsOptional()
  @IsString()
  itprodsn?: string | null;

  @IsOptional()
  @IsString()
  matprima?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  pcomprcmin?: number | null;

  @IsOptional()
  @IsString()
  servicosn?: string | null;

  @IsOptional()
  @IsString()
  cest?: string | null;

  @IsOptional()
  @IsString()
  emitnf?: string | null;

  @IsOptional()
  @IsString()
  cnae?: string | null;

  @IsOptional()
  @IsString()
  vendmultemb?: string | null;

  @IsOptional()
  @IsString()
  naobaixarmp?: string | null;

  @IsOptional()
  @IsString()
  naovembalanca?: string | null;

  @IsOptional()
  @IsString()
  abrelote?: string | null;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isdeleted?: boolean | null;

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

  @IsOptional()
  @IsString()
  CCLASSTRIB?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  CCLASSTRIB_ID?: number | null;

  @IsOptional()
  @IsString()
  categoria_ncm?: string | null;

  @IsOptional()
  @IsString()
  cst_ibs_cbs_padrao?: string | null;

  @IsOptional()
  @IsString()
  industrializado_zfm?: string | null;

  @IsOptional()
  @IsString()
  fiscal_validado?: string | null;

  @IsOptional()
  @IsDateString()
  fiscal_validado_em?: string | null;

  @IsOptional()
  @IsString()
  fiscal_origem?: string | null;

  @IsOptional()
  @IsString()
  ComboSN?: string | null;

  @IsOptional()
  @IsString()
  combosn?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncTItensFormulaDto)
  formulas?: SyncTItensFormulaDto[];
}

export class SyncTItensEmpresaBatchDto {
  @IsUUID()
  ID_EMPRESA!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItensBatchItemDto)
  items!: SyncTItensBatchItemDto[];
}

export class SyncTItensBatchDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItensBatchItemDto)
  items?: SyncTItensBatchItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SyncTItensEmpresaBatchDto)
  Empresa?: SyncTItensEmpresaBatchDto[];
}

export class SyncTItensBatchResultItemDto {
  @Expose()
  id!: string;

  @Expose()
  action!: 'INSERTED' | 'UPDATED' | 'SKIPPED' | 'ERROR';

  @Expose()
  message!: string;
}

export class SyncTItensBatchResponseDto {
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
  @Type(() => SyncTItensBatchResultItemDto)
  results!: SyncTItensBatchResultItemDto[];
}
