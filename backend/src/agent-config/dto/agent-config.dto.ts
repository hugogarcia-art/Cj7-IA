import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
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

export class UpsertAgentConfigDto {
  @IsIn(['personal', 'salud', 'ropa', 'custom'], {
    message: 'Categoría no válida.',
  })
  category: string;

  @Trim()
  @IsString()
  @MinLength(1, { message: 'El nombre del agente es obligatorio.' })
  @MaxLength(40)
  agentName: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  personality?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  extraConfig?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
export class SetOpenAiKeyDto {
  @IsString()
  @MinLength(20, { message: 'La API key de OpenAI parece inválida.' })
  @MaxLength(300)
  apiKey: string;
}

export class SetPromptModeDto {
  @IsIn(['oficial', 'custom'], { message: 'Modo de prompt no válido.' })
  promptMode: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  customPrompt?: string;
}
