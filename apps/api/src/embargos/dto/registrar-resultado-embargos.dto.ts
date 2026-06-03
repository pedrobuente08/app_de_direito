import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class RegistrarResultadoEmbargosDto {
  @IsIn(['ACOLHIDOS', 'PARCIALMENTE_ACOLHIDOS', 'REJEITADOS'])
  resultado!: 'ACOLHIDOS' | 'PARCIALMENTE_ACOLHIDOS' | 'REJEITADOS';

  @IsDateString()
  dataJulgamento!: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
