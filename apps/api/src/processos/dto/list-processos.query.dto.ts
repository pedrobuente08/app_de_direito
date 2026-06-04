import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'numero',
  'vara',
  'materia',
  'sistema',
  'clienteNome',
  'ultimaMovimentacaoDt',
] as const;

export class ListProcessosQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn([...SORT_FIELDS])
  sort?: (typeof SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vara?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  login?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sistema?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ATIVO', 'SOBRESTADO', 'ARQUIVADO'])
  statusProcesso?: string;

  /** @deprecated Preferir `statusProcesso`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  situacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faseAtual?: string;

  /** Qualidade do processo (`qualidade_caso`); coluna “Situação” na grid. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  qualidadeCaso?: string;

  /** Última sentença: favorável ao autor, ao réu ou sem registro. */
  @IsOptional()
  @IsString()
  @IsIn(['BOA', 'RUIM', 'SEM'])
  filterUltimaSentenca?: 'BOA' | 'RUIM' | 'SEM';

  /** Processos com `avaliacao_recurso.ativa = true`. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  emAvaliacao?: boolean;

  /** Pendência aberta ou prazo vencendo (≤2 dias). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  acaoImediata?: boolean;

  /** `status_processo = ARQUIVADO` alterados nos últimos 30 dias. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  arquivados30d?: boolean;

  /** Filtra processos com `ultima_movimentacao_dt` nos últimos N dias (ex: 30). */
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(730)
  movimentacaoRecenteDias?: number;
}
