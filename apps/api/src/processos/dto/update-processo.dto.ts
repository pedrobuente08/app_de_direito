import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/** Atualização parcial para edição em grid — não altera `numero` nem `escritorioId`. */
export class UpdateProcessoDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  clienteCpf?: string | null;

  @IsOptional()
  @IsUUID('4')
  reuId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reuTexto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sistema?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vara?: string | null;

  /** ISO `YYYY-MM-DD`. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataDistribuicao deve estar em YYYY-MM-DD',
  })
  dataDistribuicao?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataAudiencia deve estar em YYYY-MM-DD',
  })
  dataAudiencia?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaAudiencia deve estar em HH:mm',
  })
  horaAudiencia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoAudiencia?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['ATIVO', 'SOBRESTADO', 'ARQUIVADO'])
  statusProcesso?: string;

  /** @deprecated Preferir `statusProcesso`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  situacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faseAtual?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  qualidadeCaso?: string | null;

  @IsOptional()
  @IsObject()
  avaliacaoRecurso?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  justicaGratuita?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  situacaoFinal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  statusAudiencia?: string | null;

  @IsOptional()
  @IsISO8601()
  ultimaMovimentacaoDt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ultimaMovimentacaoTipo?: string | null;

  @IsOptional()
  @IsBoolean()
  requerConferencia?: boolean;

  @IsOptional()
  @IsBoolean()
  alertaCrVara?: boolean;

  @IsOptional()
  @IsBoolean()
  litiganciaMaFe?: boolean;

  @IsOptional()
  @IsString()
  observacoes?: string | null;

  @IsOptional()
  @IsString()
  observacaoGeral?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoCr?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataTransito deve estar em YYYY-MM-DD',
  })
  dataTransito?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  comprovanteResidenciaTipo?: string | null;
}
