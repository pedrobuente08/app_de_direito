import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegistrarSegundoGrauDto {
  @IsUUID('4')
  processoId!: string;

  @IsIn(['A', 'B', 'C', 'D'])
  cenario!: 'A' | 'B' | 'C' | 'D';

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;

  @IsOptional()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  valor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  turma?: string | null;
}
