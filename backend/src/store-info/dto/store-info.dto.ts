import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
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

export class UpsertStoreInfoDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  schedule?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  deliveryLocal?: boolean;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  deliveryCities?: string;
}
