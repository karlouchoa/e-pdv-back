import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : Number(value);

export class CreatePublicPedidoOnlineComboDto {
  @IsUUID()
  idItemEscolhido!: string;

  @Transform(toNumber)
  @IsInt()
  @Min(1)
  cdgru!: number;

  @Transform(toNumber)
  @IsNumber()
  @Min(0.001)
  quantity!: number;
}
