import { IsObject, IsOptional } from 'class-validator';

/** Campos em snake_case como retornados pela skill (`processo`). */
export class AplicarExtracaoDto {
  @IsOptional()
  @IsObject()
  campos?: Record<string, unknown>;
}
