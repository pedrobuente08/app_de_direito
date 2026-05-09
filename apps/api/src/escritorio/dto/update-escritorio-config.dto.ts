import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DropdownsProcessoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  situacao?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sentenca?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fase_atual?: string[];
}

/**
 * Campos opcionais do `escritorio.config` (merge parcial em `PATCH /config`).
 * Ver `VISAO_GERAL_SOFTWARE.md` § Config Comunica.
 */
export class UpdateEscritorioConfigDto {
  @IsOptional()
  @IsObject()
  mapa_comarcas?: Record<string, string>;

  @IsOptional()
  @IsObject()
  login_map?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materias_validas?: string[];

  @IsOptional()
  @IsString()
  fase_inicial?: string;

  @IsOptional()
  @IsString()
  situacao_inicial?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DropdownsProcessoDto)
  dropdowns_processo?: DropdownsProcessoDto;

  @IsOptional()
  @IsString()
  comunica_webhook_token?: string | null;

  /** Chaves = `tipo` da publicação em MAIÚSCULAS (ex.: `INTIMAÇÃO`). Ver documentação. */
  @IsOptional()
  @IsObject()
  comunica_regras?: Record<string, unknown>;

  /** Digest por e-mail (cron ~7h); requer SMTP na API. */
  @IsOptional()
  @IsObject()
  comunica_digest?: Record<string, unknown>;
}
