import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class FinalizarAudienciaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  obsPos!: string;

  /** Padrão `REALIZADA` (histórico). `CANCELADA` | `ADIADA` | `REDESIGNADA` → lixeira. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  /** Obrigatório quando `status` é REALIZADA (ou omitido). */
  @IsOptional()
  @IsString()
  @IsIn(['PRESENTE', 'AUSENTE'])
  autorPresenca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  motivoAusencia?: string;

  @IsOptional()
  @IsUUID('4')
  escritorioAdversarioId?: string | null;
}
