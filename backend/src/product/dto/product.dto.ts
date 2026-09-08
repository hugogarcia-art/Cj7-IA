import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Recorta espacios ANTES de validar.
 *
 * Sin esto, un nombre de "   " pasa @MinLength(1) porque son tres caracteres,
 * y luego se guarda como cadena vacia. Lo mismo con el SKU.
 */
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** Los enteros del formulario no admiten decimales ni signo. */
const INTEGER = /^[0-9]+$/;

/**
 * El formulario del frontend viaja como multipart/form-data (lleva la imagen),
 * así que todos los campos numéricos llegan como texto. Validamos que sean
 * numéricos y los convertimos en el servicio.
 */
export class CreateProductDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio.' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @Trim()
  @IsString()
  @MinLength(1, { message: 'El SKU es obligatorio.' })
  @MaxLength(60)
  sku: string;

  @IsNumberString({}, { message: 'El precio debe ser un número.' })
  price: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El precio de oferta debe ser un número.' })
  offerPrice?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El costo debe ser un número.' })
  cost?: string;

  @IsOptional()
  @Matches(INTEGER, { message: 'El stock debe ser un número entero.' })
  stock?: string;

  @IsOptional()
  @Matches(INTEGER, { message: 'El stock mínimo debe ser un número entero.' })
  minStock?: string;

  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'Agotado'])
  status?: string;
}

export class UpdateProductDto {
  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre no puede quedar vacío.' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El SKU no puede quedar vacío.' })
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El precio debe ser un número.' })
  price?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El precio de oferta debe ser un número.' })
  offerPrice?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El costo debe ser un número.' })
  cost?: string;

  @IsOptional()
  @Matches(INTEGER, { message: 'El stock debe ser un número entero.' })
  stock?: string;

  @IsOptional()
  @Matches(INTEGER, { message: 'El stock mínimo debe ser un número entero.' })
  minStock?: string;

  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'Agotado'])
  status?: string;
}
