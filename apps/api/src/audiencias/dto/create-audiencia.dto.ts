import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateAudienciaDto {
  @IsUUID('4')
  processoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string | null;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar em YYYY-MM-DD' })
  data!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora em HH:mm' })
  hora?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pautista?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  obsPre?: string | null;

  @IsOptional()
  @IsString()
  obsPos?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;
}
