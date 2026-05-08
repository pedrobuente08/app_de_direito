import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProcessoDto {
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  numero!: string;

  @IsString()
  @MaxLength(20)
  sistema!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  clienteCpf?: string | null;

  @IsOptional()
  @IsUUID('4')
  reuId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reuTexto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vara?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataDistribuicao?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataAudiencia?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaAudiencia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoAudiencia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  situacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faseAtual?: string | null;

  @IsOptional()
  @IsBoolean()
  requerConferencia?: boolean;
}
