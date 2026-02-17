import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CourierQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  ativosn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class UpsertCourierDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  desep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  nrocart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  categoria?: string;

  @IsOptional()
  @IsDateString()
  vencart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  fonecel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  tpsep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  senha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cdgru?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cdsub?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  desub?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  ativosn?: string;
}

export class SalesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cidade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nrven?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class DispatchSaleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  codconfV?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  changeFor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  printerAutocod?: number;
}

export class CustomersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class UpsertCustomerDto {
  @IsString()
  @MaxLength(60)
  decli!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  fantcli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  dddcli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  fonecli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  celcli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emailcli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpjCpfcli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  tipocli?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  ativocli?: string;
}

export class UpsertCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  logradouro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pontoReferencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoLocal?: string;

  @IsOptional()
  @IsString()
  instrucoesEntrega?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  tipoEndereco?: string;
}

export class CashStatusQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  codabe?: number;
}

export class OpenCashierDto {
  @Type(() => Number)
  @IsNumber()
  openingBalance!: number;

  @IsOptional()
  @IsBoolean()
  forceClosePrevious?: boolean;
}

export class CloseCashierDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  codabe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  closingBalance?: number;
}

export class CashierReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  codabe?: number;

  @IsOptional()
  @IsDateString()
  referenceDate?: string;
}

export class CashItemSearchDto {
  @IsString()
  @MaxLength(120)
  term!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CashPaymentDto {
  @Type(() => Number)
  @IsNumber()
  cdtpg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cdfpg?: number;
}

export class CashFinalizeItemDto {
  @IsString()
  @MaxLength(50)
  idItem!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CashFinalizeDto {
  @IsOptional()
  @IsUUID()
  importedSaleId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  changeFor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashFinalizeItemDto)
  items?: CashFinalizeItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CashPaymentDto)
  payments!: CashPaymentDto[];
}
