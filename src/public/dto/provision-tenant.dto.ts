import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  cnpj!: string;

  @IsString()
  @IsOptional()
  inscricaoEstadual?: string;

  @IsString()
  @IsNotEmpty()
  nomeFantasia!: string;

  @IsString()
  @IsNotEmpty()
  razaoSocial!: string;

  @IsString()
  @IsOptional()
  apelido?: string;

  @IsString()
  @IsOptional()
  endereco?: string;

  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  uf?: string;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsOptional()
  contatoNome?: string;

  @IsString()
  @IsOptional()
  contatoTelefone?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  ddd?: string;

  @IsEmail()
  email!: string;

  @IsEmail()
  @IsOptional()
  emailConfirmacao?: string;

  @IsString()
  @IsOptional()
  site?: string;

  @IsString()
  @IsNotEmpty()
  usuarioLogin!: string;

  @IsString()
  @IsNotEmpty()
  usuarioNome!: string;

  @IsString()
  @IsNotEmpty()
  senha!: string;

  @IsString()
  @IsNotEmpty()
  confirmarSenha!: string;

  @IsString()
  @Matches(/^[SNsn]$/)
  @IsOptional()
  usuarioAdm?: string;

  @IsString()
  @Matches(/^[SNsn]$/)
  @IsOptional()
  usuarioAtivo?: string;

  @IsString()
  @IsOptional()
  certificadoCaminhoPfx?: string;

  @IsString()
  @IsOptional()
  certificadoSenha?: string;

  @IsString()
  @IsOptional()
  certificadoNumeroSerie?: string;

  @IsString()
  @IsOptional()
  cscId?: string;

  @IsString()
  @IsOptional()
  cscToken?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ultimaNfe?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  serieNfe?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ultimaNfce?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  serieNfce?: number;

  @IsString()
  @IsOptional()
  regimeFiscalTipo?: string;

  @IsString()
  @IsOptional()
  crt?: string;

  @IsString()
  @IsOptional()
  subdominioPreferido?: string;

  @IsString()
  @IsOptional()
  funcaoAcesso?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  imagemCapaUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  taxaEntrega?: number;
}

export class ProvisionTenantResponseDto {
  banco!: string;
  subdominio!: string;
  cnpj!: string;
  usuario!: {
    cdusu: string;
    email: string;
  };
  status!: 'PROVISIONED';
  correlationId!: string;
}
