import { Transform } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

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
}
