import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const msg = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Configuración de entorno inválida: ${msg}`);
  }
  const isProd = validated.NODE_ENV === 'production';
  if (isProd && validated.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET debe tener al menos 32 caracteres en producción');
  }
  if (isProd && validated.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción');
  }
  return validated;
}
