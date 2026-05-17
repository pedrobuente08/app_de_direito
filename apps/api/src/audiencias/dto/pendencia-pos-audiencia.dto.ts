import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PendenciaPosAudienciaDto {
  @IsString()
  @MaxLength(50)
  tipo!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataLimite?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;
}
