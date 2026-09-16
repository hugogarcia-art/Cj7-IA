import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** FormData manda "true"/"false" como texto: lo convertimos antes de validar. */
const ToBoolean = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

export class CreateBankAccountDto {
  @Trim()
  @IsString()
  @MinLength(3, { message: 'El nombre del titular es obligatorio.' })
  @MaxLength(120)
  fullName: string;

  @Trim()
  @IsString()
  @MinLength(2, { message: 'El nombre del banco es obligatorio.' })
  @MaxLength(80)
  bankName: string;

  @Trim()
  @IsString()
  @MinLength(4, { message: 'El número de cuenta es obligatorio.' })
  @MaxLength(40)
  accountNumber: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  cci?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  yapePhone?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(3, { message: 'El nombre del titular es obligatorio.' })
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'El nombre del banco es obligatorio.' })
  @MaxLength(80)
  bankName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(4, { message: 'El número de cuenta es obligatorio.' })
  @MaxLength(40)
  accountNumber?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  cci?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  yapePhone?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isDefault?: boolean;
}
