import { Transform } from 'class-transformer';
import {
  buildMessage,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';

const REFERENCE_DATE_VALIDATION_NAME = 'isReferenceDateInput';

export function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function TrimOptionalString(): PropertyDecorator {
  return Transform(({ value }) => trimOptionalString(value));
}

export function parseReferenceDateInput(value?: string | null): Date | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00`)
    : new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function IsReferenceDateInput(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: REFERENCE_DATE_VALIDATION_NAME,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && parseReferenceDateInput(value) !== null,
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property deve ser uma data de referencia valida.`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
