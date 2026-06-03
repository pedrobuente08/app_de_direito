import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const SOBRESTAMENTO_MOTIVOS = [
  'IRDR_IAC_STJ',
  'IRDR_IAC_TJBA',
  'ACORDO_EXTRAJUDICIAL_NEGOCIACAO',
  'PREJUDICIAL_EXTERNA',
  'INDEFERIMENTO_INICIAL_RECURSO',
  'OUTRO',
] as const;

export class SobrestarProcessoDto {
  @IsString()
  @IsOptional()
  motivo?: string;

  @IsDateString()
  sobrestadoDesde!: string;

  @IsOptional()
  @IsIn(SOBRESTAMENTO_MOTIVOS)
  motivoCodigo?: (typeof SOBRESTAMENTO_MOTIVOS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  temaAfetado?: string;

  @IsOptional()
  @IsDateString()
  previsaoRetorno?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
