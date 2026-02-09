import { Type } from 'class-transformer';
import { IsInt, IsString, IsPositive, MaxLength } from 'class-validator';

export class RequestPresignedUrlDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  fileType!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  fileSize!: number;
}
