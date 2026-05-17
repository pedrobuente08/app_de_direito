import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
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
  status_processo?: string[];

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
  @IsString()
  status_processo_inicial?: string;

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

  /** Ex.: `{ "AGUARDANDO AUDIÊNCIA": ["AGUARDANDO SENTENÇA", "EM RECURSO"] }` */
  @IsOptional()
  @IsObject()
  transicoes_fase?: Record<string, string[]>;

  @IsOptional()
  @IsInt()
  @Min(1)
  prazo_avaliacao_recurso_dias?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  prazo_elaborar_recurso_dias?: number;
}
