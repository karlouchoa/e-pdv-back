import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export class ComboRuleDto {
  @IsNumber()
  @Transform(toNumber)
  cdgru!: number;

  @IsNumber()
  @Transform(toNumber)
  @Min(0.0001)
  qtde!: number;

  @IsOptional()
  @Transform(({ value, obj }: { value: unknown; obj: Record<string, unknown> }) => {
    const candidate = value ?? obj.idSubgrupo;
    if (candidate === null || candidate === undefined) {
      return undefined;
    }

    const trimmed = String(candidate).trim();
    return trimmed.length ? trimmed : undefined;
  })
  @IsUUID('all')
  id_subgrupo?: string;
}
