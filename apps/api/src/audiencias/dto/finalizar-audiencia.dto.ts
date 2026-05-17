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
}
