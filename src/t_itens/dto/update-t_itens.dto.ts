import { PartialType } from '@nestjs/mapped-types';
import { CreateTItemDto } from './create-t_itens.dto';
import { IsIn,  IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTItemDto extends PartialType(CreateTItemDto) {
  
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

  // ✅ Campo de preço (aceita números e strings numéricas)
  @IsOptional()
  @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value)))
  @IsNumber()
  preco?: number;
  
    // ✅ Campo de custo, se quiser atualizar junto
  @IsOptional()
  @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value)))
  @IsNumber()
  custo?: number;
    
  @IsOptional()
  @IsString()
  @IsIn(['S', 'N', ''])
  @Transform(({ value }) => (value === "" ? "N" : value))
  itprodsn?: string;
  
  @IsOptional()
  @IsString()
  @IsIn(['S', 'N', ''])
  @Transform(({ value }) => (value === "" ? "N" : value))
  matprima?: string;

  @IsOptional()
  @IsString()
  obsitem?: string;

  @IsOptional()
  @IsString()
  locfotitem?: string;

}
