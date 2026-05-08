import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CumprirPendenciaDto {
  /** Padrão `CUMPRIDO`. Também aceita `AUTOR FALECIDO` (vai para histórico). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
