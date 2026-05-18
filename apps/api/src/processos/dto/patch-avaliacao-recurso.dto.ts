import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PatchAvaliacaoRecursoDto {
  @IsBoolean()
  ativa!: boolean;

  @IsOptional()
  @IsISO8601()
  prazo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  @IsOptional()
  @IsString()
  observacao?: string | null;
}
