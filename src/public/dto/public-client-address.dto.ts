import { Expose } from 'class-transformer';

export class PublicClientAddressDto {
  @Expose()
  id!: string;

  @Expose()
  id_cliente!: string;

  @Expose()
  cep?: string | null;

  @Expose()
  logradouro?: string | null;

  @Expose()
  numero?: string | null;

  @Expose()
  bairro?: string | null;

  @Expose()
  cidade?: string | null;

  @Expose()
  uf?: string | null;

  @Expose()
  complemento?: string | null;

  @Expose()
  ponto_referencia?: string | null;

  @Expose()
  tipo_local?: string | null;

  @Expose()
  instrucoes_entrega?: string | null;

  @Expose()
  latitude?: number | null;

  @Expose()
  longitude?: number | null;

  @Expose()
  tipo_endereco?: string | null;
}
