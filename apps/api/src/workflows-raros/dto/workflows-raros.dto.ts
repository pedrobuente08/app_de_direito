import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SucessorInputDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  parentesco?: string;
}

export class RegistrarAutorFalecidoDto {
  @IsDateString()
  dataObito!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SucessorInputDto)
  sucessores!: SucessorInputDto[];

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CriarTutelaDto {
  @IsIn(['TUTELA_ANTECIPADA', 'TUTELA_CAUTELAR', 'LIMINAR'])
  tipo!: 'TUTELA_ANTECIPADA' | 'TUTELA_CAUTELAR' | 'LIMINAR';

  @IsDateString()
  pedidoEm!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  prazoCumprimento?: string;
}

export class AtualizarTutelaDto {
  @IsOptional()
  @IsIn(['DEFERIDA', 'INDEFERIDA', 'PARCIALMENTE_DEFERIDA', 'REVOGADA', 'PENDENTE'])
  resultado?: string;

  @IsOptional()
  @IsDateString()
  dataResultado?: string;

  @IsOptional()
  @IsBoolean()
  cumprida?: boolean;

  @IsOptional()
  @IsDateString()
  cumpridaEm?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class HabilitarSucessorDto {
  @IsOptional()
  @IsDateString()
  habilitadoEm?: string;
}
