import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ORDER_STATUS_VALUES = ['PENDENTE', 'SEPARACAO', 'PRODUCAO', 'CONCLUIDA', 'CANCELADA'] as const;
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export class RegisterOrderStatusDto {
  @IsIn(ORDER_STATUS_VALUES)
  status!: OrderStatus;

  @IsOptional()
  @IsDateString()
  event_time?: string;

  @IsString()
  @MaxLength(120)
  responsible!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
