import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export const TIPOS_INTERLOCUTORIA = [
  'TUTELA_DEFERIDA',
  'TUTELA_INDEFERIDA',
  'EMENDA_INICIAL',
  'JUNTADA_DOCUMENTOS',
  'CITACAO_REALIZADA',
  'SANEAMENTO',
  'OUTRO_INTERLOCUTORIO',
] as const;

export type TipoInterlocutoria = (typeof TIPOS_INTERLOCUTORIA)[number];

export class ClassificarInterlocutoriaDto {
  @IsUUID()
  processoId!: string;

  @IsIn(TIPOS_INTERLOCUTORIA)
  tipo!: TipoInterlocutoria;

  @IsOptional()
  @IsString()
  conteudo?: string;

  @IsOptional()
  @IsDateString()
  prazoCumprimento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsUUID()
  comunicacaoId?: string;
}
