import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PendenciaPosAudienciaDto } from './pendencia-pos-audiencia.dto';

/** Cenários pós-audiência REALIZADA (BRIEFING_DEV_V3 / FLUXO 1 JUIZADO PROJUDI). */
export const CENARIO_AUDIENCIA_OPCOES = [
  'REVELIA',
  'TODOS_COMPARECERAM',
  'SO_ADVOGADO',
  'UNA',
  'FRACIONADA',
  'DOCUMENTACAO_PENDENTE',
] as const;

export type CenarioAudiencia = (typeof CENARIO_AUDIENCIA_OPCOES)[number];

export class FinalizarAudienciaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  obsPos!: string;

  /** Padrão `REALIZADA` (histórico). `CANCELADA` | `ADIADA` | `REDESIGNADA` → lixeira (+ nova audiência se REDESIGNADA). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  /** Obrigatório quando `status` é REALIZADA ou REDESIGNADA com controle de presença. */
  @IsOptional()
  @IsString()
  @IsIn(['PRESENTE', 'AUSENTE'])
  autorPresenca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  motivoAusencia?: string;

  /** Nova data da audiência redesignada (`YYYY-MM-DD`). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  novaData?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  novaHora?: string | null;

  @IsOptional()
  @IsBoolean()
  houvePendencia?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendenciaPosAudienciaDto)
  pendencias?: PendenciaPosAudienciaDto[];

  @IsOptional()
  @IsUUID('4')
  escritorioAdversarioId?: string | null;

  /** Obrigatório quando `status` = REALIZADA (Sprint C). */
  @IsOptional()
  @IsString()
  @IsIn([...CENARIO_AUDIENCIA_OPCOES])
  cenario?: CenarioAudiencia;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cenarioObservacao?: string | null;
}
