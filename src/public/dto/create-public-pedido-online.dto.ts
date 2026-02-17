import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePublicPedidoOnlineItemDto } from './create-public-pedido-online-item.dto';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreatePublicPedidoOnlineDto {
  @IsOptional()
  @IsUUID()
  idCliente?: string;

  @IsOptional()
  @IsUUID()
  idEndereco?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === null
      ? undefined
      : String(value).trim().toUpperCase(),
  )
  @IsIn(['ENTREGA', 'RETIRADA'])
  tipoEntrega?: 'ENTREGA' | 'RETIRADA';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  canal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  obs?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  desconto?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  taxaEntrega?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePublicPedidoOnlineItemDto)
  items!: CreatePublicPedidoOnlineItemDto[];
}
