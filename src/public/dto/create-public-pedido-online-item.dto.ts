import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePublicPedidoOnlineComboDto } from './create-public-pedido-online-combo.dto';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreatePublicPedidoOnlineItemDto {
  @IsUUID()
  idItem!: string;

  @Transform(toNumber)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  obsItem?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicPedidoOnlineComboDto)
  comboChoices?: CreatePublicPedidoOnlineComboDto[];
}
