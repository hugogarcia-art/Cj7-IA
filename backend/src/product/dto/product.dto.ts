import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * El formulario del frontend viaja como multipart/form-data (lleva la imagen),
 * así que todos los campos numéricos llegan como texto. Validamos que sean
 * numéricos y los convertimos en el servicio.
 */
export class CreateProductDto {
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
  @IsNumberString({}, { message: 'El stock debe ser un número.' })
  stock?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El stock mínimo debe ser un número.' })
  minStock?: string;

  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'Agotado'])
  status?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
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
  @IsNumberString({}, { message: 'El stock debe ser un número.' })
  stock?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El stock mínimo debe ser un número.' })
  minStock?: string;

  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'Agotado'])
  status?: string;
}
