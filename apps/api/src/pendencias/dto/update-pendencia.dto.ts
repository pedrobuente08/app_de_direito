import { Matches, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePendenciaDto {
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
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataCumprimento?: string | null;

  @IsOptional()
  @IsString()
  observacao?: string | null;
}
