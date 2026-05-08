import {
  IsBoolean,
  IsISO8601,
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
  @MaxLength(50)
  situacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faseAtual?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataSentenca deve estar em YYYY-MM-DD',
  })
  dataSentenca?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  sentenca?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'valorSentenca deve ser numérico com até 2 casas decimais',
  })
  valorSentenca?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  recurso?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  turma?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  acordao?: string | null;

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
}
