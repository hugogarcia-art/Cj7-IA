import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class UpsertWhatsAppCredentialsDto {
  @Trim()
  @IsString()
  @MinLength(5, { message: 'El Phone Number ID es obligatorio.' })
  @MaxLength(40)
  phoneNumberId: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  wabaId?: string;

  @Trim()
  @IsString()
  @MinLength(20, { message: 'El Access Token parece inválido (muy corto).' })
  @MaxLength(600)
  accessToken: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  displayPhone?: string;
}
