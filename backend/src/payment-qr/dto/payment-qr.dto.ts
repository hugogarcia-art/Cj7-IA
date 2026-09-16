import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

const ToBoolean = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

export class CreatePaymentQrDto {
  @Trim()
  @IsString()
  @MinLength(2, { message: 'La etiqueta es obligatoria.' })
  @MaxLength(80)
  label: string;

  /** Monto fijo del QR (ej: "379"). Vacío = QR libre de cualquier monto. Llega como texto multipart. */
  @IsOptional()
  @IsNumberString({}, { message: 'El monto debe ser un número.' })
  amount?: string;

  /** Cuenta bancaria vinculada (opcional). */
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdatePaymentQrDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'La etiqueta es obligatoria.' })
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El monto debe ser un número.' })
  amount?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isDefault?: boolean;
}
