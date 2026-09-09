import { Transform, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Los mismos valores que ofrece el desplegable del formulario. */
export const CLIENT_STATUSES = ['Nuevo', 'En Proceso', 'VIP', 'Inactivo'];

/**
 * Trata la cadena vacia como "no enviado".
 *
 * El formulario envia siempre todos los campos, tambien los que el usuario
 * dejo en blanco. Sin esto, un correo vacio llega como "" y @IsEmail lo
 * rechaza, cuando la intencion era justamente no poner correo.
 */
const EmptyToUndefined = () =>
  Transform(({ value }: TransformFnParams): string | undefined => {
    if (value == null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  });

export class CreateClientDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio.' })
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'El teléfono no es válido.',
  })
  phone: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email?: string;

  // El formulario tiene un desplegable de Estado tambien al crear.
  @IsOptional()
  @IsIn(CLIENT_STATUSES, { message: 'El estado no es válido.' })
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s()-]{7,20}$/, { message: 'El teléfono no es válido.' })
  phone?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsIn(CLIENT_STATUSES, { message: 'El estado no es válido.' })
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  lastContact?: string;
}

export class ImportClientsDto {
  @IsString()
  @MinLength(1, { message: 'No hay nada que importar.' })
  @MaxLength(500_000, { message: 'El texto a importar es demasiado grande.' })
  rawText: string;
}
