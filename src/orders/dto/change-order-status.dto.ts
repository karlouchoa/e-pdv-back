import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ALLOWED_SOURCES = ['ADMIN', 'PUBLIC', 'SYSTEM'] as const;

export class ChangeOrderStatusDto {
  @IsString()
  @MaxLength(20)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @IsIn(ALLOWED_SOURCES)
  source?: (typeof ALLOWED_SOURCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
