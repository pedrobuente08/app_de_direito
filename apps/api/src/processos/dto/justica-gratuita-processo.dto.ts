import { IsIn, IsOptional, IsString } from 'class-validator';

export class JusticaGratuitaProcessoDto {
  @IsIn(['CONCEDER', 'RENOVAR', 'REVOGAR'])
  operacao!: 'CONCEDER' | 'RENOVAR' | 'REVOGAR';

  @IsOptional()
  @IsString()
  observacao?: string;
}
