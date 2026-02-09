import { Expose, Type } from 'class-transformer';
import { PublicClientAddressDto } from './public-client-address.dto';

export class PublicClientDto {
  @Expose()
  id!: string;

  @Expose()
  cdcli!: number;

  @Expose()
  cdemp!: number;

  @Expose()
  decli?: string | null;

  @Expose()
  fantcli?: string | null;

  @Expose()
  dddcli?: string | null;

  @Expose()
  fonecli?: string | null;

  @Expose()
  celcli?: string | null;

  @Expose()
  emailcli?: string | null;

  @Expose()
  cnpj_cpfcli?: string | null;

  @Expose()
  @Type(() => PublicClientAddressDto)
  enderecos?: PublicClientAddressDto[];
}
