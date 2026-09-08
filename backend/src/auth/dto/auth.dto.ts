import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'Ingresa tu correo o nombre de usuario.' })
  @MaxLength(255)
  identifier: string;

  @IsString()
  @MinLength(1, { message: 'Ingresa tu contraseña.' })
  @MaxLength(128)
  password: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'El usuario debe tener al menos 3 caracteres.' })
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'El usuario solo admite letras, números, punto, guion y guion bajo.',
  })
  username: string;

  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsIn(['Masculino', 'Femenino', 'Otro'])
  gender?: string;
}
