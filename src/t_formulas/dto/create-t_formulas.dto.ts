import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTFormulaDto {
  @IsInt()
  cditem!: number;

  @IsInt()
  empitem!: number;

  @IsString()
  undven!: string;

  @IsInt()
  matprima!: number;

  @IsNumber()
  qtdemp!: number;

  @IsString()
  undmp!: string;

  @IsInt()
  empitemmp!: number;

  @IsOptional()
  @IsString()
  deitem_iv?: string;
}
