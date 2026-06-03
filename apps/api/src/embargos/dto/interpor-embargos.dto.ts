import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class InterporEmbargosDto {
  @IsUUID()
  sentencaId!: string;

  @IsUUID()
  processoId!: string;

  @IsIn(['NOS', 'REU', 'AMBOS'])
  origem!: 'NOS' | 'REU' | 'AMBOS';

  @IsDateString()
  dataInterposicao!: string;

  @IsOptional()
  @IsDateString()
  prazoJulgamento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsBoolean()
  interrompePrazoRecurso?: boolean;
}
