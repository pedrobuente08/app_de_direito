import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CumprirPendenciaDto {
  /** Padrão `CUMPRIDA`. Também aceita `AUTOR_FALECIDO` (vai para histórico). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  motivoCumprimento!: string;
}
