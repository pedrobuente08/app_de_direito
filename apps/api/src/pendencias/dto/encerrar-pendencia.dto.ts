import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const RESULTADOS = [
  'CUMPRIDA',
  'NAO_CUMPRIDA',
  'SEM_EXITO',
  'AUTOR_FALECIDO',
  'DEIXOU_DE_RESPONDER',
] as const;

export class EncerrarPendenciaDto {
  @IsIn(RESULTADOS)
  resultado!: (typeof RESULTADOS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  proximaAcao?: string | null;
}
