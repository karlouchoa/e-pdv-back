import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { RecordRawMaterialDto } from './record-raw-material.dto';

export class IssueRawMaterialsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordRawMaterialDto)
  raw_materials!: RecordRawMaterialDto[];

  @Transform(({ value, obj }) => value ?? obj.warehouse ?? obj?.wharehouse)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  warehouse?: string;

  @Transform(({ value, obj }) => value ?? obj.user ?? obj.codusu)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  user?: string;

  @Transform(({ value, obj }) => value ?? obj.responsible)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsible?: string;

  @Transform(({ value, obj }) => value ?? obj.notes ?? obj.remarks)
  @IsOptional()
  @IsString()
  notes?: string;
}
