import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateTItemDto {
  @IsString()
  deitem!: string;

  @IsOptional()
  @IsString()
  barcodeit?: string;

  @IsOptional()
  @IsString()
  codcst?: string;

  @IsOptional()
  @IsString()
  clasfis?: string;

  @IsOptional()
  @IsString()
  cest?: string;

  @IsOptional()
  @IsNumber()
  preco?: number;

  @IsOptional()
  @IsNumber()
  custo?: number;

  @IsOptional()
  @IsString()
  @IsIn(['S', 'N'])
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? 'N' : value,
  )
  itprodsn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['S', 'N'])
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? 'N' : value,
  )
  matprima?: string;

  @IsOptional()
  @IsString()
  obsitem?: string;

  @IsOptional()
  @IsString()
  locfotitem?: string;
}
