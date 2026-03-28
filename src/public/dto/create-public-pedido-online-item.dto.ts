import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePublicPedidoOnlineComboDto } from './create-public-pedido-online-combo.dto';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreatePublicPedidoOnlineItemDto {
  @Transform(({ value, obj }: { value: unknown; obj: Record<string, unknown> }) =>
    toNumber({ value: value ?? obj.idItem ?? obj.id_item }),
  )
  @IsInt()
  cditem!: number;

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
