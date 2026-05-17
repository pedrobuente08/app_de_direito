import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class PosImprocedenciaDto {
  @IsUUID('4')
  sentencaId!: string;

  @IsString()
  @IsIn(['RECORRER', 'NAO_RECORRER', 'AVALIAR'])
  decisao!: 'RECORRER' | 'NAO_RECORRER' | 'AVALIAR';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  valorSucumbencia?: string | null;

  @IsOptional()
  @IsString()
  observacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  /** Só para AVALIAR; default vem de `escritorio.config.prazo_avaliacao_recurso_dias`. */
  @IsOptional()
  @IsInt()
  @Min(1)
  prazoDias?: number;
}
