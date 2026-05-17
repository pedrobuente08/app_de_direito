import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CumprirPendenciaDto {
  /** Padrão `CUMPRIDO`. Também aceita `AUTOR FALECIDO` (vai para histórico). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  motivoCumprimento!: string;
}
