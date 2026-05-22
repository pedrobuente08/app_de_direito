import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSentencaDto {
  @IsString()
  @MaxLength(20)
  grau!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;

  @IsOptional()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  valor?: string | null;

  @IsString()
  @MaxLength(40)
  resultado!: string;

  @IsString()
  @MaxLength(10)
  favoravelPara!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  turma?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assessorJulgador?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  turnoJulgamento?: string | null;

  @IsOptional()
  @IsString()
  observacoes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoDecisao?: 'MONOCRATICA' | 'COLEGIADA' | null;

  @IsOptional()
  turmaRecursal?: number | null;
}
