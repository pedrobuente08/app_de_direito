import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
