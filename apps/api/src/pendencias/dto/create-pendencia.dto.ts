import { Matches, IsOptional, IsString, IsUUID, MaxLength, IsIn } from 'class-validator';

export class CreatePendenciaDto {
  @IsUUID('4')
  processoId!: string;

  @IsString()
  @MaxLength(50)
  tipo!: string;

  /** `YYYY-MM-DD`; default hoje no service. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataAbertura?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataLimite?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  solicitante?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  observacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn([
    'POS_AUDIENCIA',
    'MANUAL_INTIMACOES',
    'COMUNICA',
    'IMPORT',
    'MANUAL',
  ])
  origem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fila?: string | null;
}
